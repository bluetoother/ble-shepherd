'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccbnp = require('cc-bnp');

var GATTDEFS = require('../../defs/gattdefs'),
    bledb = require('../bledb');

function Characteristic (charInfo) {
    this._id = null;
    this._authState = null;

    this._ownerServ = null;
    this.uuid = charInfo.uuid;
    this.hdl = charInfo.hdl;
    this.prop = charInfo.prop;
    this.desc = charInfo.desc ? charInfo.desc : null;
    this.name = null;
    this.val = null;

    this.processInd = function () {};

    if (GATTDEFS.CharUuid.get(_.parseInt(this.uuid))) { 
        this.name = GATTDEFS.CharUuid.get(_.parseInt(this.uuid)).key;
    } else if (GATTDEFS.CharUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10)))) {
         this.name = GATTDEFS.CharUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10))).key; 
    }
} 

//TODO LongCharValue
Characteristic.prototype.read = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (_.includes(this.prop, 'read')) {
        ccbnp.gatt.readCharValue(this._ownerServ._ownerDev.connHdl, this.hdl, this.uuid).then(function (result) {
            self.val = result.collector.AttReadRsp[0].value;
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

//TODO LongCharValue
Characteristic.prototype.write = function (value, callback) {
    var self = this,
        deferred = Q.defer(),
        cmd;

    if (!value || (!_.isPlainObject(value) && !Buffer.isBuffer(value))) {
        deferred.reject(new TypeError('value must be an object or a buffer'));
    } else if (_.includes(this.prop, 'write') || _.includes(this.prop, 'writeWithoutResponse')) {
        if (_.includes(this.prop, 'write')) {
            cmd = 'writeCharValue';
        } else if (_.includes(this.prop, 'writeWithoutResponse')) {
            cmd = 'writeNoRsp';
        }

        ccbnp.gatt[cmd](this._ownerServ._ownerDev.connHdl, this.hdl, value, this.uuid).then(function () {
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

//TODO LongCharDesc
Characteristic.prototype.readDesc = function (callback) {
    var self = this,
        deferred = Q.defer(),
        ownerServ = this._ownerServ,
        startHdl = this.hdl,
        endHdl = getEndHdl(ownerServ, startHdl);

    ccbnp.gatt.readUsingCharUuid(ownerServ._ownerDev.connHdl, startHdl, endHdl, '0x2901').then(function (result) {
        self.desc = result.collector.AttReadByTypeRsp[0].data.attrVal0;
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

Characteristic.prototype.setConfig = function (config) {
    var self = this,
        deferred = Q.defer(),
        ownerServ = this._ownerServ,
        startHdl = this.hdl,
        endHdl = getEndHdl(ownerServ, startHdl),
        val;

    if (!_.isBoolean(config)) {
        deferred.reject(new TypeError('config must be a boolean'));
    }else if (_.includes(this.prop, 'notify') || _.includes(this.prop, 'indicate')) {
        if (config === false) {
            val = {properties: 0x0000};
        } else if (_.includes(this.prop, 'notify') && (config === true)) { 
            val = {properties: 0x0001};
        } else if (_.includes(this.prop, 'indicate') && (config === true)) {
            val = {properties: 0x0002};
        }
        
        ccbnp.gatt.readUsingCharUuid(ownerServ._ownerDev.connHdl, startHdl, endHdl, '0x2902').then(function (result) {
            return ccbnp.gatt.writeCharValue(ownerServ._ownerDev.connHdl, result.collector.AttReadByTypeRsp[0].data.attrHandle0, val, '0x2902');
        }).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.reject(new Error('Characteristic can\'t Notif or Ind'));
    }

    return deferred.promise;
};

Characteristic.prototype.expInfo = function () {
    return {
        owner: this._ownerServ._id,
        ancestor: this._ownerServ._ownerDev._id,
        uuid: this.uuid,
        hdl: this.hdl,
        prop: this.prop,
        val: this.val,
        desc: this.desc
    };
};

Characteristic.prototype.save = function () {
    var self = this,
        deferred = Q.defer(),
        charInfo = this.expInfo();

    if (Buffer.isBuffer(charInfo.val)) {
        charInfo.val = charInfo.val.toJSON(); 
    }

    bledb.saveInfo('characteristic', charInfo).then(function (doc) {
        self._id = doc._id;
        deferred.resolve(doc);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Characteristic.prototype.indUpdate = function (value) { 
    this.val = value;
    return bledb.update(this._id, {val: value});
};

Characteristic.prototype.update = function () {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.val;

    if (_.includes(this.prop, 'read')) {
        this.read().then(function () {
            if (!_.isEqual(oldVal, self.val)) {
                return bledb.update(self._id, {val: self.val});
            } else {
                return;
            }            
        }).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.resolve();
    }    

    return deferred.promise;
};

Characteristic.prototype._encryptAndReExec = function (type, value) {
    var self = this,
        deferred = Q.defer(),
        ownerDev = this._ownerServ._ownerDev,
        checkErr;

    if (arguments.length < 1) { checkErr = new Error('Bad arguments.'); }
    if (type !== 'read' && type !== 'readDesc' && type !== 'write' ) { 
        checkErr = checkErr || new Error('type input error'); 
    }

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
        console.log('service uuid: ' + self._ownerServ.uuid + ', connHandle: ' + self._ownerServ.uuid);
        deferred.reject();
    } 

    return deferred.promise;
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