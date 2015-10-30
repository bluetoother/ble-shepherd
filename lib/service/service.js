'use strict';

var Q = require('q'),
	_ = require('lodash');

var bleHci = require('../hci/bleHci'),
	BDEFS = require('../defs/bledefs');

function Service (servInfo) {
	this.ownerDev = null;
	this.uuid = servInfo.uuid;
	this.name = BDEFS.Gatt.ServUuid.get(this.uuid).key;
	this.startHdl = servInfo.startHdl;
	this.endHdl = servInfo.endHdl;
	this.chars = [];
}

Service.prototype.getChars = function () {

};

Service.prototype.save = function () {

};

Service.prototype.update = function () {

};

Service.prototype.remove = function () {

};

Service.prototype.readCharsInfo = function () {

};

Service.prototype.readCharVal = function () {

};

Service.prototype.writeCharVal = function () {

};

module.exports = Service;