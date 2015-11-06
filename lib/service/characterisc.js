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
} 

Characteristic.prototype.read = function (callback) {

};

Characteristic.prototype.write = function (callback) {

};

Characteristic.prototype.readDesc = function (callback) {

};

Characteristic.prototype.writeDesc = function (callback) {

};

Characteristic.prototype.addIndListener = function (callback) {

};

Characteristic.prototype.update = function (callback) {

};

Characteristic.prototype.save = function (callback) {

};

Characteristic.prototype.remove = function (callback) {

};