'use strict';

var Q = require('q'),
	_ = require('lodash');

var bleHci = require('../hci/bleHci');

function Characteristic (charInfo) {
	this.ownerServ = null;
	this.uuid = null;
	this.hdl = null;
	this.props = null;
	this.name = null;
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

Characteristic.prototype.update = function (callback) {

};

Characteristic.prototype.save = function (callback) {

};

Characteristic.prototype.remove = function (callback) {

};