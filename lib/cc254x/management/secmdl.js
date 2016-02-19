'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../../defs/bledefs'),
    GAPDEFS = require('../../defs/gapdefs'),
    bledb = require('../bledb');

function Secmdl(setting) {
    this._ownerDev = null;
    this.state = 'unencrypted'; //'encrypted', 'unencrypted'
    this.pairMode = GAPDEFS.PairingMode.get('WaitForReq').value;
    this.ioCap = GAPDEFS.IoCap.get('KeyboardDisplay').value; 
    this.mitm = true;
    this.bond = true;
    this.ltk = null;
    this.div = null;
    this.rand = null;

    if (setting) {
        if (!_.isUndefined(setting.mitm)) { this.mitm = setting.mitm; }
        if (!_.isUndefined(setting.bond)) { this.bond = setting.bond; }
        if (!_.isUndefined(setting.pairMode)) { this.pairMode = setting.pairMode; }
        if (!_.isUndefined(setting.ioCap)) { this.ioCap = setting.ioCap; }
    }
}

Secmdl.prototype.setParam = function (param, val) {
    var deferred = Q.defer(),
        paramId,
        value,
        checkErr;

    if (arguments.length < 2) { checkErr = new Error('Bad Arguments.'); }
    if (!_.isNumber(param) && !_.isString(param)) { checkErr = checkErr || new TypeError('param must be a number or string'); }
    if (!_.isNumber(val)) { checkErr = checkErr || new TypeError('val must be a number'); }

    paramId = GAPDEFS.BondParam[param];
    if (paramId) {
        paramId = paramId.value;        
    } else {
        checkErr = checkErr || new Error('Param input error.');
    }

    if (paramId === 0x0408) {
        value = new Buffer([val >> 24, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF]);
    } else {
        value = new Buffer([val]);
    }

    if (checkErr) {
        deferred.reject(checkErr);
    } else {
        ccBnp.gap.bondSetParam(paramId, value.length, value).then(function (result) {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }
    
    return deferred.promise;
};

Secmdl.prototype.init = function () {
    var self = this,
        deferred = Q.defer(),
        mitm = this.mitm ? 1 : 0,
        bond = this.bond ? 1 : 0;

    this.setParam('PairingMode', this.pairMode).then(function () {
        return self.setParam('MitmProtection', mitm);
    }).then(function () {
        return self.setParam('IoCap', self.ioCap);
    }).then(function () {
        return self.setParam('BondingEnabled', bond);
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Secmdl.prototype.passPasskey = function (passkey) {
    var deferred = Q.defer(),
        passkeyStr,
        len,
        subStr = '';

    if (!_.isNumber(passkey) || _.size(passkey.toString()) > 6) {
        deferred.reject(new Error('passkey must be number and should not exceed six numbers'));
    } else {
        passkeyStr = passkey.toString();
        if (_.size(passkeyStr) < 6) {
            len = 6 - _.size(passkeyStr);
            for (var i = 0; i < len; i += 1) {
                subStr += '0';
            }
            passkeyStr = subStr + passkeyStr;
        }
        ccBnp.gap.passkeyUpdate(this._ownerDev.connHdl, passkeyStr).then(function () {
            deferred.resolve();
        }).fail(function(err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise;
};

Secmdl.prototype.pairing = function () {
    var self = this,
        deferred = Q.defer(),
        bond = this.bond ? 0x01 : 0x00,
        mitm = this.mitm ? 0x04 : 0x00,
        keyDist = GAPDEFS.KeyDistList.get('All').value,
        cmdResult;

    ccBnp.gap.authenticate(this._ownerDev.connHdl, this.ioCap, 0, new Buffer(16).fill(0), bond | mitm, 16, keyDist, 0, 0, 0, 0, 16, keyDist)
    .then(function (result) {
        cmdResult = result[1].GapAuthenticationComplete;
        if (cmdResult.status === BDEFS.GenericStatus.SUCCESS.value) {
            self.ltk = cmdResult.dev_ltk;
            self.div = cmdResult.dev_div;
            self.rand = cmdResult.dev_rand;
            deferred.resolve();
        } else if (self.mitm) {
            self.mitm = false;
            self.setParam('MitmProtection', 0).then(function () {
                process.nextTick(function () {
                    self.pairing();
                });
			});
        } else {
            deferred.reject(new Error('Pairing not allowed.'));
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Secmdl.prototype.cancelPairing = function () {
    var deferred = Q.defer();

    ccBnp.gap.terminateAuth(this._ownerDev.connHdl, 3).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Secmdl.prototype.bonding = function () {
    var self = this,
        deferred = Q.defer(),
        mitm = this.mitm ? 1 : 0;

    if (!this.ltk || !this.div || !this.rand) {
        deferred.reject(new Error('No complete information to bond to a device.'));
    } else { 
        ccBnp.gap.bond(this._ownerDev.connHdl, mitm, this.ltk, this.div, this.rand, this.ltk.length).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise;
};

Secmdl.prototype.cleanAllBond = function () {
    var deferred = Q.defer();

    ccBnp.gap.bondSetParam(GAPDEFS.BondParam['EraseAllbonds'].value, 0, new Buffer([0])).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Secmdl.prototype.expInfo = function () {
    return {
        pairMode: this.pairMode,
        ioCap: this.ioCap,
        mitm: this.mitm,
        bond: this.bond,
        ltk: this.ltk,
        div: this.div,
        rand: this.rand
    };
};

Secmdl.prototype.update = function (setting) {
    var self = this,
        deferred = Q.defer(),
        saveInfo,
        checkErr;

    if (!setting) { setting = {}; }
    if (_.isFunction(setting)) {
        callback = setting;
        setting = {};
    } else if (_.isPlainObject(setting)) {
        _.forEach(setting, function (val, key) {
            if (_.has(self, key)) { self[key] = val; }
        });
    }

    saveInfo = this.expInfo();

    if (!_.isPlainObject(setting)) {
        deferred.reject(new TypeError('setting must be an object.'));
    } else {
        bledb.update(this._ownerDev._id, {sm: saveInfo}).then(function () {
            deferred.resolve('Security modle update success.');
        }).fail(function () {
            deferred.reject('Security modle update fail.');
        }).done();
    }

    return deferred.promise;
};

module.exports = Secmdl;