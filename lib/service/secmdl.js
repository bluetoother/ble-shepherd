'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs'),
	GAPDEFS = require('../defs/gapdefs');

function Secmdl(setting) {
	this.ownerDev = null;
	this.state = 'unencrypted'; //'encrypted', 'unencrypted'
	this.pairMode = setting.pairMode | GAPDEFS.PairingMode.get('WaitForReq').value;
	this.ioCap = setting.ioCap | GAPDEFS.IoCap.get('KeyboardDisplay').value;
	this.mitm = setting.mitm | true;
	this.bond = setting.bond | true;

	this.ltk = null;
	this.div = null;
	this.rand = null;
}

Secmdl.cleanAllBond = function (callback) {
	var deferred = Q.defer();

	ccBnp.gap.bondSetParam(GAPDEFS.BondParam['EraseAllbonds'].value, 0, new Buffer([0])).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.setParam = function (param, val, callback) {
	var deferred = Q.defer(),
		paramId = GAPDEFS.BondParam[param].value,
		val = new Buffer([val]);

	ccBnp.gap.bondSetParam(paramId, val.length, val).then(function (result) {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.init = function (callback) {
	var self = this,
		deferred = Q.defer();

	this.setParam('PairingMode', this.pairMode).then(function () {
		return self.setParam('MitmProtection', self.mitm);
	}).then(function () {
		return self.setParam('IoCap', self.ioCap);
	}).then(function () {
		return self.setParam('BondingEnabled', self.bond);
	}).then(function () {
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
		keyDist = GAPDEFS.KeyDistList.get('All').value,
		pairResult;

	ccBnp.gap.authenticate(this.ownerDev.connHdl, this.ioCap, 0, new Buffer(16).fill(0), bond | mitm, 16, keyDist, 0, 0, 0, 0, 16, keyDist)
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

	ccBnp.gap.bond(this.ownerDev.connHdl, this.mitm, this.ltk, this.div, this.rand, this.ltk.length).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Secmdl.prototype.update = function (setting, callback) {

}

module.exports = Secmdl;