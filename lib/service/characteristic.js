'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs'),
	bledb = require('./bledb'),
	GATTDEFS = require('../defs/gattdefs');

function Characteristic (charInfo) {
	this._id = null;
	this._isSync = false;

	this.ownerServ = null;
	this.uuid = charInfo.uuid;
	this.hdl = charInfo.hdl;
	this.prop = charInfo.prop;
	this.name = null;
	this.val = null;
	this.desc = null;

	if (GATTDEFS.CharUuid.get(this.uuid)) { this.name = GATTDEFS.CharUuid.get(this.uuid).key; }
} 

//TODO LongCherValue
Characteristic.prototype.read = function (callback) {
	var self = this,
		deferred = Q.defer();

	ccBnp.gatt.readCharValue(this.ownerServ.ownerDev.connHdl, this.hdl).then(function (result) {
		self.val = result[1].AttReadRsp.value;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

//TODO LongCherValue
Characteristic.prototype.write = function (value, callback) {
	var self = this,
	deferred = Q.defer();

	ccBnp.gatt.writeCharValue(this.ownerServ.ownerDev.connHdl, this.hdl, value).then(function () {
		self.val = value;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

//TODO LongCherDesc
Characteristic.prototype.readDesc = function (callback) {
	var self = this,
	deferred = Q.defer();

	ccBnp.gatt.readCharDesc(this.ownerServ.ownerDev.connHdl, this.hdl).then(function (result) {
		self.desc = result[1].AttReadRsp.value;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

//TODO LongCherDesc
Characteristic.prototype.writeDesc = function (desc, callback) {
	var self = this,
	deferred = Q.defer();

	ccBnp.gatt.writeCharDesc(this.ownerServ.ownerDev.connHdl, this.hdl, desc).then(function () {
		self.desc = desc;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.addIndListener = function (callback) {

};

Characteristic.prototype.expInfo = function () {
	return {
		owner: this.ownerServ._id,
		ancestor: this.ownerServ.ownerDev._id,
		uuid: this.uuid,
		hdl: this.hdl,
		prop: this.prop,
		val: this.val
	};
};

Characteristic.prototype.update = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.val;

    if (GATTDEFS.Prop.get('Read').value & this.prop) {
        this.read().then(function () {
            if (oldVal !== self.val) {
                return bledb.update(self._id, {val: self.val});
            } else {
                return;
            }            
        }).then(function (numReplaced) {
            deferred.resolve(numReplaced);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.resolve();
    }    

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.save = function (callback) {
	var self = this,
		deferred = Q.defer(),
		charInfo = this.expInfo();

	bledb.saveCharInfo(charInfo).then(function (doc) {
		self._id = doc._id;
		deferred.resolve(doc);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.remove = function (callback) {

};

module.exports = Characteristic;