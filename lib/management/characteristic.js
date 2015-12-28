'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs'),
    bledb = require('../bledb'),
    GATTDEFS = require('../defs/gattdefs');

function Characteristic (charInfo) {
    this._id = null;
    this._isSync = false;
    this._authState = null;

    this.ownerServ = null;
    this.uuid = charInfo.uuid;
    this.hdl = charInfo.hdl;
    this.prop = charInfo.prop;
    this.desc = charInfo.desc ? charInfo.desc : null;
    this.name = null;
    this.val = null;

    this.processInd = function () {};
    if (GATTDEFS.CharUuid.get(_.parseInt(this.uuid))) { 
        this.name = GATTDEFS.CharUuid.get(_.parseInt(this.uuid)).key;
    }
} 

Characteristic.prototype._encryptAndReExec = function (type, value, callback) {
    var self = this,
        deferred = Q.defer(),
        ownerDev = this.ownerServ.ownerDev,
        checkErr;

    if (arguments.length < 1) { checkErr = new Error('Bad arguments.'); }
    if (type !== 'read' && type !== 'readDesc' && type !== 'write' ) { 
        checkErr = checkErr || new Error('type input error'); 
    }

    if (type === 'read' || type === 'readDesc') { callback = value; }

    if (checkErr) {
        deferred.reject(checkErr);
    } else if (_.isNull(this._authState)) {
        ownerDev.encrypt({}).then(function () {
            self._authState = 'success';
            if (type === 'read' || type === 'readDesc') {
                return self[type]();
            } else {
                return self.write(value);
            }
        }).then(function () {
            return bledb.update(this._id, {val: self.val});
        }).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            if (self._authState !== 'success') { self._authState = 'fail'; }
            deferred.reject(err);
        }).done();
    } else {
        console.log('Wanrning: ');
        console.log('The ' + self.uuid + ' characteristic can not be ' + type + ' because failure to establish an encrypted connection.');
        console.log('service uuid: ' + self.ownerServ.uuid + ', connHandle: ' + self.ownerServ.uuid);
        deferred.reject();
    } 

    return deferred.promise.nodeify(callback);
};

//TODO LongCherValue
Characteristic.prototype.read = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (_.includes(this.prop, 'Read')) { 
        ccBnp.gatt.readCharValue(this.ownerServ.ownerDev.connHdl, this.hdl, this.uuid).then(function (result) {
            self.val = result[1].AttReadRsp.value;
            deferred.resolve(self.val);
        }).fail(function (err) {
            if (err.errorCode === 5 || err.errorCode === 8 || err.errorCode === 15) {
                self._encryptAndReExec('read');
                deferred.resolve(self.val);
            } else {
                deferred.reject(err);
            }
        }).done();
    } else {
        deferred.reject(new Error('Characteristic value not allowed to read.'));
    }

    return deferred.promise.nodeify(callback);
};

//TODO LongCherValue
Characteristic.prototype.write = function (value, callback) {
    var self = this,
        deferred = Q.defer(),
        cmd;

    if (!value || (!_.isPlainObject(value) && !Buffer.isBuffer(value))) {
        deferred.reject(new TypeError('value must be an object or a buffer'));
    } else if (_.includes(this.prop, 'Write') || _.includes(this.prop, 'WriteNoRsp')) {
        if (_.includes(this.prop, 'Write')) {
            cmd = 'writeCharValue';
        } else if (_.includes(this.prop, 'WriteNoRsp')) {
            cmd = 'writeNoRsp';
        }

        ccBnp.gatt[cmd](this.ownerServ.ownerDev.connHdl, this.hdl, value, this.uuid).then(function () {
            self.val = value;
            deferred.resolve();
        }).fail(function (err) {
            if (err.errorCode === 5 || err.errorCode === 8 || err.errorCode === 15) {
                self._encryptAndReExec('write', value);
                deferred.resolve();
            } else {
                deferred.reject(err);
            }
        }).done();
    } else {
        deferred.reject(new Error('Characteristic value not allowed to write.'));
    }

    return deferred.promise.nodeify(callback);
};

//TODO LongCherDesc
Characteristic.prototype.readDesc = function (callback) {
    var self = this,
        deferred = Q.defer(),
        ownerServ = this.ownerServ,
        startHdl = this.hdl,
        endHdl = getEndHdl(ownerServ, startHdl);

    ccBnp.gatt.readUsingCharUuid(ownerServ.ownerDev.connHdl, startHdl, endHdl, '0x2901').then(function (result) {
        self.desc = result[1].AttReadByTypeRsp0.data.attrVal0;
        deferred.resolve(self.desc);
    }).fail(function (err) {
        if (err.errorCode === 5 || err.errorCode === 8 || err.errorCode === 15) {
            self._encryptAndReExec('readDesc');
            deferred.resolve(self.desc);
        } else {
            deferred.reject(err);
        }
    }).done();

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.getConfig = function (callback) {
    var self = this,
        deferred = Q.defer(),
        ownerServ = this.ownerServ,
        startHdl = this.hdl,
        endHdl = getEndHdl(ownerServ, startHdl),
        val;

    if (_.includes(this.prop, 'Notif') || _.includes(this.prop, 'Ind')) {
        if (_.includes(this.prop, 'Notif')) {
            val = 0;
        } else if (_.includes(this.prop, 'Ind')) {
            val = 1;
        }

        ccBnp.gatt.readUsingCharUuid(ownerServ.ownerDev.connHdl, startHdl, endHdl, '0x2902').then(function (result) {
            if (result[1].AttReadByTypeRsp0.data.attrVal0.Properties === 0) {
                deferred.resolve(false);
            } else {
                deferred.resolve(true);
            }
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.reject(new Error('Characteristic can\'t Notif or Ind'));
    }

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.setConfig = function (config, callback) {
    var self = this,
        deferred = Q.defer(),
        ownerServ = this.ownerServ,
        startHdl = this.hdl,
        endHdl = getEndHdl(ownerServ, startHdl),
        val;

    if (!_.isBoolean(config)) {
        deferred.reject(new TypeError('config must be a boolean'));
    }else if (_.includes(this.prop, 'Notif') || _.includes(this.prop, 'Ind')) {
        if (config === false) {
            val = {Properties: 0x0000};
        } else if (_.includes(this.prop, 'Notif') && (config === true)) { 
            val = {Properties: 0x0001};
        } else if (_.includes(this.prop, 'Ind') && (config === true)) {
            val = {Properties: 0x0002};
        }

        ccBnp.gatt.readUsingCharUuid(ownerServ.ownerDev.connHdl, startHdl, endHdl, '0x2902').then(function (result) {
            return ccBnp.gatt.writeCharValue(ownerServ.ownerDev.connHdl, result[1].AttReadByTypeRsp0.data.attrHandle0, val, '0x2902');
        }).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.reject(new Error('Characteristic can\'t Notif or Ind'));
    }

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.expInfo = function () {
    return {
        owner: this.ownerServ._id,
        ancestor: this.ownerServ.ownerDev._id,
        uuid: this.uuid,
        hdl: this.hdl,
        prop: this.prop,
        val: this.val,
        desc: this.desc
    };
};

Characteristic.prototype.save = function (callback) {
    var self = this,
        deferred = Q.defer(),
        charInfo = this.expInfo();

    if (Buffer.isBuffer(charInfo.val)) {
        charInfo.val = charInfo.val.toJSON(); 
    }

    bledb.saveInfo('characteristic', charInfo).then(function (doc) {
        self._id = doc._id;
        self._isSync = true;
        deferred.resolve();
    }).fail(function (err) {
        self._isSync = true;
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.indUpdate = function (value, callback) { 
    var self = this,
        deferred = Q.defer();

    this.val = value;
    bledb.update(this._id, {val: value}).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.update = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.val;

    if (_.includes(this.prop, 'Read')) {
        this.read().then(function () {
            if (!_.isEqual(oldVal, self.val)) {
                return bledb.update(self._id, {val: self.val});
            } else {
                return;
            }            
        }).then(function () {
            self._isSync = true;
            deferred.resolve();
        }).fail(function (err) {
            self._isSync = false;
            deferred.reject(err);
        }).done();
    } else {
        self._isSync = true;
        deferred.resolve();
    }    

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.remove = function (callback) {
    var self = this,
        deferred = Q.defer(),
        servChars = this.ownerServ.chars;

    bledb.remove('characteristic', this._id).then(function () {
        servChars.splice(_.indexOf(servChars, self), 1);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

function getEndHdl (serv, startHdl) {
    var endHdl = [];

    _.forEach(serv.chars, function (char) {
        if (char.hdl > startHdl) { endHdl.push(char.hdl); }
    });

    if (endHdl[0]) {
        endHdl = endHdl[0] - 1;
    } else {
        endHdl = serv.endHdl;
    }

    return endHdl;
}

module.exports = Characteristic;