'use strict';

var Q = require('q'),
	_ = require('lodash');

var bleHci = require('../hci/bleHci'),
	BDEFS = require('../defs/bledefs');

function Sysmgr () {
	if (_.isObject(Sysmgr.instance)) { return Sysmgr.instance; }
	Sysmgr.instance = this;

	this.irk = null;
	this.csrk = null;
}

Sysmgr.prototype.init = function (callback) {
	var deferred = Q.defer(),
		resultObj = {};

	bleHci.execCmd('Gap', 'DeviceInit', {profileRole: 8, maxScanResponses: 5, IRK: new Buffer(16), CSRK: new Buffer(16), signCounter: 1}).then(function (result) {
		resultObj.addr = result[1].GapDeviceInitDone.devAddr;
		resultObj.irk = result[1].GapDeviceInitDone.IRK;
		resultObj.csrk = result[1].GapDeviceInitDone.CSRK;
		deferred.resolve(resultObj);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Sysmgr.prototype.hardReset = function (callback) {
	var deferred = Q.defer();

	bleHci.execCmd('Hci', 'ResetSystem', {mode: 0}).then(function (result) {
		deferred.resolve({status: result[0].HciResetSystem.status});
	});

	return deferred.promise.nodeify(callback);
};

Sysmgr.prototype.softReset = function (callback) {
	var deferred = Q.defer();

	bleHci.execCmd('Hci', 'ResetSystem', {mode: 1}).then(function (result) {
		deferred.resolve({status: result[0].HciResetSystem.status});
	});

	return deferred.promise.nodeify(callback);
};

module.exports = Sysmgr;