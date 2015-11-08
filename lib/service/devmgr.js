'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var Service = require('./service'),
	Secmdl = require('./secmdl');

function Devmgr () {
	if (_.isObject(Devmgr.instance)) { return Devmgr.instance; }
	Devmgr.instance = this;

	this.connDevs = [];
	this.discDevs = [];
}

Devmgr.prototype.newDiscDevice = function (devs) {
	_.forEach(devs, function (dev) {

	});
};

Devmgr.prototype.newDevice = function (role, addr, addrType) {
	var oldDev = this.findDev(addr),
		newDev;

	if (oldDev) {
		newDev = oldDev;
	} else {
		newDev = new BleDevice(role, addr, addrType);
		this.discDevs.push(newDev);
	}

	return newDev;
};

Devmgr.prototype.loadDevs = function () {

};

Devmgr.prototype.findDev = function (addrOrHdl) {
	var obj,
		devsArr = this.connDevs.concat(this.discDevs);

	if (_.isString(addrOrHdl)) { obj = {addr: addrOrHdl}; }
	if (_.isNumber(addrOrHdl)) { obj = {connHdl: addrOrHdl}; }

	return _.find(devsArr, obj);
};

function BleDevice (role, addr, addrType) {
	this.role = role; //central, peripherial
	this.addr = addr;
	this.addrType = addrType;
	this.state = 'discovered'; //online, offline, discovered
	this.connHdl = null;
	this.linkParams  = null;
	this.services = [];
	this.sm = null;
}

BleDevice.prototype.connect = function (callback) {
	var self = this,
		deferred = Q.defer(),
		oldState = this.state,
		connInfo;

	if (this.state === 'online') { deferred.reject(new Error('Device is already in a connection.')); }

	ccBnp.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
		connInfo = result[1].GapLinkEstablished;
		self.state = 'online';
		self.connHdl = connInfo.connHandle;
		self.linkParams = {
			interval: connInfo.connInterval, 
			latency: connInfo.connLatency, 
			timeout: connInfo.connTimeout
		};

		if (oldState === 'discovered') { return self.getServs(); }
		if (oldState === 'offline') { return self.update(); }
	}).then(function () {
		deferred.resolve(self);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.disConnect = function (callback) {
	var self = this,
		deferred = Q.defer();

	if (this.state !== 'online') { deferred.reject(new Error('Device is not in a connection.')); }

	ccBnp.gap.terminateLink(this.connHdl, 19).then(function () {
		self.state = 'offline';
		self.connHdl = null;
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.linkParamUpdate = function (interval, connLatency, connTimeout, callback) {
	var self = this,
		deferred = Q.defer();

	if ( this.role === 'central' ) {
	    ccBnp.gap.setParam(21, interval).then(function () {
	        return ccBnp.gap.setParam(22, interval);
	    }).then(function () {
	        return ccBnp.gap.setParam(26, connLatency);
        }).then(function () {
	        return ccBnp.gap.setParam(25, connTimeout);
        }).then(function () {
            self.linkParams = {
				interval: interval, 
				latency: connLatency,
				timeout: connTimeout
			};
            deferred.resolve();
	    }).fail(function (err) {
	        deferred.reject(err);
	    }).done();  

	} else {
		ccBnp.gap.updateLinkParamReq(this.connHdl, interval, interval, connLatency, connTimeout).then(function () {
			self.linkParams = {
				interval: interval, 
				latency: connLatency,
				timeout: connTimeout
			};
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		}).done();
	}

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.getServs = function (callback) {
	var self = this,
		deferred = Q.defer(),
		servObj,
		service,
		servsInfo = [],
		getCharFuncs = [];

	ccBnp.gatt.discAllPrimaryServices(this.connHdl).then(function (result) {
		_.forEach(result[1], function (evtObj) {
            if (evtObj.status === 0) { 
                servObj = evtObj.data;
                for (var i = 0; i < (_.keys(servObj).length / 3); i += 1) {
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
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.createSecMdl = function (setting) {
	this.sm = new Secmdl(setting);
	this.sm.ownerDev = this;

	if (setting.ltk !== (new Buffer(16).fill(0))) {
		this.sm.state = 'encrypted';
		this.sm.ltk = setting.ltk;
		this.sm.div = setting.div;
		this.sm.rand = setting.rand;
	}
	return this.sm;
};

BleDevice.prototype.passPasskey = function (passkey, callback) {
	var deferred = Q.defer();

	ccBnp.gap.passkeyUpdate(this.connHdl, passkey).then(function () {
		deferred.resolve();
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.encrypt = function (setting, callback) {
	var self = this,
		deferred = Q.defer(),
		setting = setting | {};

	if (!this.sm) { 
		this.sm = new Secmdl(setting); 
		this.sm.ownerDev = this; 
	}

	this.sm.init().then(function () {
		return self.sm.pairing();
	}).then(function () {
		if (self.sm.bond === 1) { 
			return self.sm.bonding(); 
		} else {
			return;
		}
	}).then(function () {
		deferred.resolve();
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.update = function (callback) {

};

BleDevice.prototype.save = function (callback) {

};

BleDevice.prototype.remove = function (callback) {

};

BleDevice.prototype.checkOnline = function (callback) {
	
};


function DiscDevice (addr, addrType) {
	this.ownerDevmgr = null;
	this.addr = addr;
	this.addrType = addrType;
}

DiscDevice.prototype.connect = function (callback) {
	var self = this,
		deferred = Q.defer(),
		bleDev,
		connInfo,
		devmgr = this.ownerDevmgr;

	ccBnp.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
		connInfo = result[1].GapLinkEstablished;

		bleDev = new BleDevice('peripheral', self.addr, self.addrType);	
		bleDev.state = 'online';
		bleDev.connHdl = connInfo.connHandle;
		bleDev.linkParams = {
			interval: connInfo.connInterval, 
			latency: connInfo.connLatency, 
			timeout: connInfo.connTimeout
		};

		delete devmgr.discDevs[_.indexOf(devmgr.discDevs, self)];
		devmgr.connDevs.push(bleDev);

		return devmgr.getServs();
	}).then(function () {
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

module.exports = Devmgr;