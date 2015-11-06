'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs');

function Characteristic (charInfo) {
	this.ownerServ = null;
	this.uuid = charInfo.uuid;
	this.hdl = charInfo.hdl;
	this.prop = charInfo.prop;
	this.name = BDEFS.Gatt.CharUuid.get(this.uuid).key;
	this.val = null;
	this.desc = null;
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
};

Characteristic.prototype.addIndListener = function (callback) {

};

Characteristic.prototype.update = function (callback) {

};

Characteristic.prototype.save = function (callback) {

};

Characteristic.prototype.remove = function (callback) {

};