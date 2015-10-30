'use strict';

var Q = require('q'),
	_ = require('lodash');

var bleHci = require('../hci/bleHci'),
	Service = require('./service');

function Devmgr () {
	if (_.isObject(Devmgr.instance)) { return Devmgr.instance; }
	Devmgr.instance = this;

	this.connDevs = [];
	this.discDevs = [];
}

Devmgr.prototype.newDevice = function (role, addr, addrType) {
	var oldDev = this.findDev(addr),
		newDev;

	if (oldDev) {
		newDev = oldDev;
	} else {
		newDev = new BleDevice(role, addr, addrType);
		this.discDevs.push(newDev);
	}

	//TODO , store to db?
};

Devmgr.prototype.loadDevs = function () {

};

Devmgr.prototype.findDev = function (addr) {
	var devsArr = this.connDevs.concat(this.discDevs);

	return _.find(devsArr, {addr: addr});
};

function BleDevice (role, addr, addrType) {
	this.role = role;
	this.addr = addr;
	this.addrType = addrType;
	this.state = 'discovered';
	this.connHdl = null;
	this.linkParams  = null;
	this.services = [];
}

BleDevice.prototype.connect = function (callback) {
	var self = this,
		deferred = Q.defer(),
		oldState = this.state,
		connInfo;

	if (this.state === 'online') { deferred.reject(new Error('Device is already in a connection.')); }

	bleHci.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
		connInfo = result[1].GapLinkEstablished;
		self.state = 'online';
		self.connHdl = connInfo.connHandle;
		self.linkParams = {
			interval: connInfo.connInterval, 
			latency: connInfo.connLatency, 
			timeout: connInfo.connTimeout
		};

		if (oldState === 'discovered') { return this.getServs(); }
		if (oldState === 'offline') { return this.update(); }
	}).then(function () {
		deferred.resolve(this);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.disConnect = function (callback) {
	var self = this,
		deferred = Q.defer();

	if (this.state !== 'online') { deferred.reject(new Error('Device is not in a connection.')); }

	bleHci.gap.terminateLink(this.connHdl, 19).then(function () {
		self.state = 'offline';
		self.connHdl = null;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.linkParamUpdate = function (callback) {

};

BleDevice.prototype.getServs = function (callback) {
	var self = this,
		deferred = Q.defer(),
		evtName,
		servObj,
		service,
		servsInfo = [],
		getCharFuncs = [];

	bleHci.gatt.discAllPrimaryServices(this.connHandle).then(function (result) {
		_.forEach(result, function (evtObj) {
			evtName = _.keys(evtObj)[0];
			if (_.startsWith(evtName, 'AttReadByGrpTypeRsp') && evtObj[evtName].status === 0) { 
				servObj = evtObj[evtName].data;
				for (var i = 0; i < (_.size(servObj) / 3); i += 1) {
					servsInfo.push({
						startHdl: servObj['attrHandle' + i], 
						endHdl: servObj['endGrpHandle' + i], 
						uuid: servObj['attrVal' + i].readUInt16LE(0)
					});
				}
			}
		});

		_.forEach(servsInfo, function (servInfo) {
			service = new Service(servInfo);
			service.ownerDev = self;
			self.services.push(service);
			getCharFuncs.push(service.getChars());
		});

		return Q.all(getCharFuncs);
	}).then(function () {

	}).fail(function (err) {
		deferred.reject(err);
	}).done();
};

BleDevice.prototype.update = function (callback) {

};

BleDevice.prototype.save = function (callback) {

};

BleDevice.prototype.remove = function (callback) {

};

BleDevice.prototype.checkOnline = function (callback) {
	
}

module.exports = Devmgr;