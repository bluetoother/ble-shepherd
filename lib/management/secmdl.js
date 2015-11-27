'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs'),
    GAPDEFS = require('../defs/gapdefs'),
    bledb = require('../bledb');

function Secmdl(setting) {
    this.ownerDev = null;
    this.state = 'unencrypted'; //'encrypted', 'unencrypted'
    this.pairMode = setting.pairMode | GAPDEFS.PairingMode.get('WaitForReq').value;
    this.ioCap = setting.ioCap | GAPDEFS.IoCap.get('KeyboardDisplay').value;
    this.mitm = setting.mitm | true;
    this.bond = setting.bond | true;

    this.ltk = null;
    this.div = null;
    this.rand = null;
}

Secmdl.prototype.setParam = function (param, val, callback) {
    var deferred = Q.defer(),
        paramId = GAPDEFS.BondParam[param].value,
        value;

    if (paramId === 0x0408) {
        value = new Buffer([val >> 24, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF]);
    } else {
        value = new Buffer([val]);
    }

    if (!paramId) {
        deferred.reject(new Error('Param input error.'));
    } else {
        ccBnp.gap.bondSetParam(paramId, value.length, value).then(function (result) {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }
    
    return deferred.promise.nodeify(callback);
};

Secmdl.prototype.init = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.setParam('PairingMode', this.pairMode).then(function () {
        return self.setParam('MitmProtection', self.mitm);
    }).then(function () {
        return self.setParam('IoCap', self.ioCap);
    }).then(function () {
        return self.setParam('BondingEnabled', self.bond);
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Secmdl.prototype.passPasskey = function (passkey, callback) {
    var deferred = Q.defer();

    ccBnp.gap.passkeyUpdate(this.ownerDev.connHdl, passkey).then(function () {
        deferred.resolve();
    }).fail(function(err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Secmdl.prototype.pairing = function (callback) {
    var self = this,
        deferred = Q.defer(),
        bond = this.bond ? 0x01 : 0x00,
        mitm = this.mitm ? 0x04 : 0x00,
        keyDist = GAPDEFS.KeyDistList.get('All').value,
        pairResult;

    ccBnp.gap.authenticate(this.ownerDev.connHdl, this.ioCap, 0, new Buffer(16).fill(0), bond | mitm, 16, keyDist, 0, 0, 0, 0, 16, keyDist)
    .then(function (result) {
        pairResult = result[1].GapAuthenticationComplete;
        if (pairResult.status === BDEFS.GenericStatus.SUCCESS.value) {
            deferred.resolve(result);
        } else if (self.mitm === true) {
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

    return deferred.promise.nodeify(callback);
};

Secmdl.prototype.cancelPairing = function (callback) {
    var deferred = Q.defer();

    ccBnp.gap.terminateAuth(this.ownerDev.connHdl, 3).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Secmdl.prototype.bonding = function (callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.bond(this.ownerDev.connHdl, this.mitm, this.ltk, this.div, this.rand, this.ltk.length).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Secmdl.cleanAllBond = function (callback) {
    var deferred = Q.defer();

    ccBnp.gap.bondSetParam(GAPDEFS.BondParam['EraseAllbonds'].value, 0, new Buffer([0])).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
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

Secmdl.prototype.update = function (setting, callback) {
    var self = this,
        deferred = Q.defer(),
        saveInfo;

    if (_.isObject(setting)) {
        _.forEach(setting, function (val, key) {
            if (_.has(self, key)) { self[key] = val; }
        });
    } else {
        callback = setting;
    }
    saveInfo = this.expInfo();

    bledb.update(this.ownerDev._id, {sm: saveInfo}).then(function () {
        deferred.resolve('Security modle update success.');
    }).fail(function () {
        deferred.reject('Security modle update fail.');
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = Secmdl;