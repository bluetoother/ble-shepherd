'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs');

function Secmdl(setting) {
	this.ownerDev = null;
	this.state = 'unencrypted'; //'encrypted', 'unencrypted'
	this.pairMode = BDEFS.GapBondMgr.PairingMode[setting.pairMode].value | 0x01;
	this.ioCap = BDEFS.GapBondMgr.PairingMode[setting.ioCap].value | 0x04;
	this.mitm = setting.mitm | true;
	this.bond = setting.bond | true;

	this.ltk = null;
	this.div = null;
	this.rand = null;
}

Secmdl.cleanAllBond = function (callback) {
	var deferred = Q.defer();

	ccBnp.gap.bondSetParam(BDEFS.GapBondMgr.Param['EraseAllbonds'].value, 0, new Buffer([0])).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.init = function (callback) {
	var self = this,
		deferred = Q.defer();

	this.setParam('PairingMode', 1, this.pairMode).then(function () {
		return self.setParam('MitmProtection', 1, self.mitm);
	}).then(function () {
		return self.setParam('IoCap', 1, self.ioCap);
	}).then(function () {
		return self.setParam('BondingEnabled', 1, self.bond);
	}).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.setParam = function (param, val, callback) {
	var deferred = Q.defer(),
		paramId = BDEFS.GapBondMgr.Param[param].value,
		val = new Buffer([val]);

	ccBnp.gap.bondSetParam(paramId, val.length, val).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.pairing = function (callback) {
	var self = this,
		deferred = Q.defer(),
		bond = this.bond ? 0x01 : 0x00,
		mitm = this.mitm ? 0x04 : 0x00,
		keyDist = BDEFS.GapBondMgr.KeyDistList.All.value,
		pairResult;

	ccBnp.gap.authenticate(this.ownerDev.conHdl, this.ioCaps, false, new Buffer(16).fill(0), bond | mitm, 16, keyDist, 0, 0, 0, 0, 16, keyDist)
	.then(function (result) {
		pairResult = result[1].GapAuthenticationComplete;
		if (pairResult.status === BDEFS.GenericStatus.SUCCESS.value) {
			self.state = 'encrypted';
			self.ltk = pairResult.dev_ltk;
			self.div = pairResult.dev_div;
			self.rand = pairResult.dev_rand;
			// TODO, sign & private address
			deferred.resolve();
		} else {
			if (self.mitm === true) {
				self.setParam('MitmProtection', 0).then(function () {
					process.nextTick(function () {
	                    self.pairing();
	                });
				});
			} else {
				deferred.reject(new Error('Pairing not allowed.'));
			}
		}
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.bonding = function (callback) {
	var deferred = Q.defer();

	ccBnp.gap.bond(this.ownerDev, this.mitm, this.ltk, this.div, this.rand, this.div.length).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.update = function (setting, callback) {
	
}

module.exports = Secmdl;