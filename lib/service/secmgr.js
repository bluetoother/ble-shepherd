'use strict';

var Q = require('q'),
	_ = require('lodash');

var bleHci = require('../hci/bleHci');

function Secmgr() {
	if (_.isObject(Secmgr.instance)) { return Secmgr.instance; }
	Secmgr.instance = this;
}

Secmgr.prototype.init = function (callback) {

};

Secmgr.prototype.encryption = function (callback) {

};

Secmgr.prototype.bonding = function (callback) {

};

module.exports = Secmgr;