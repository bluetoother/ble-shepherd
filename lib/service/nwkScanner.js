'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

function NwkScanner () {
	if (_.isObject(NwkScanner.instance)) { return NwkScanner.instance; }
	NwkScanner.instance = this;

	var nwkInfo = {
		addr: 0,
		irk: 0,
		csrk: 0,
		linkParams: {
			connInterval: 0,
			connLatency: 0,
			connTimeout: 0
		},
		scanParams: {
			scanTime: 0,
			scanInterval: 0,
			scanWindow: 0
		}
	};

	this.adverDevs = [];
	this.addr = nwkInfo.addr;
	this.scanParams = nwkInfo.scanParams;
}

NwkScanner.prototype.scan = function (callback) {
	var deferred = Q.defer(),
		devs;

	ccBnp.gap.deviceDiscReq(3, 1, 0).then(function (result) {
		devs = _.filter(_.last(result).GapDeviceDiscovery, function (val, key) {
			if (_.startsWith(key, 'dev')) { return val; }
		});
		deferred.resolve(devs);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.setScanParam = function (scanTime, scanInt, scanWin, callback) {
	var self = this,
		deferred = Q.defer();

	ccBnp.gap.setParam(2, (scanTime || 10240)).then(function (result) {
		self.scanParams.scanTime = (scanTime || 10240);
    	return ccBnp.gap.setParam(16, (scanInt || 16));
    }).then(function (result) {
    	self.scanParams.scanInterval = (scanInt || 16);
    	return ccBnp.gap.setParam(17, (scanWin || 16));
    }).then(function (result) {
    	self.scanParams.scanWindow = (scanWin || 16);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.getScanParam = function (callback) {
	var self = this,
		deferred = Q.defer();

	ccBnp.gap.getParam(2).then(function (result) {
    	self.scanParams.scanTime = result[0].GapCmdStatus.payload.readUInt16LE(0);
    	return ccBnp.gap.getParam(16);
	}).then(function (result) {
		self.scanParams.scanInterval = result[0].GapCmdStatus.payload.readUInt16LE(0);
		return ccBnp.gap.getParam(17);
    }).then(function (result) {
    	self.scanParams.scanWindow = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise.nodeify(callback);
};

module.exports = NwkScanner;