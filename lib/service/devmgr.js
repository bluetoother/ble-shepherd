'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var Service = require('./service'),
    Secmdl = require('./secmdl'),
    bledb = require('./bledb'),
    bleutil = require('../util/bleutil');

function Devmgr () {
    if (_.isObject(Devmgr.instance)) { return Devmgr.instance; }
    Devmgr.instance = this;

    this.connDevs = [];
    this.discDevs = [];
}

Devmgr.prototype.newDiscDevs = function (devsInfo) {
    var self = this,
        oldDev,
		dev;

	_.forEach(devsInfo, function (devInfo) {
		oldDev = self.findDev(devInfo.addr);

		if (!oldDev) {
			dev = new DiscDevice(devInfo.addr, devInfo.addrType);
			dev.ownerDevmgr = self;
			self.discDevs.push(dev);
		}
	});
	
	return this.discDevs;
};

Devmgr.prototype.newDevice = function (role, addr, addrType, connInfo, callback) {
	var deferred = Q.defer(),
		dev = this.findDev(connInfo.connHdl);

	if (_.isFunction(connInfo)) {
		callback = connInfo;
		connInfo = null;
	}

	if (dev) {
		deferred.resolve(dev);
	} else {
		dev = new BleDevice(role, addr, addrType, connInfo);
		this.connDevs.push(dev);
		dev.getServs().then(function (result) {
			return dev.save();
		}).then(function () {
			deferred.resolve(dev);
		}).fail(function (err) {
			deferred.reject(err);
		}).done();
	}

	return deferred.promise.nodeify(callback);
};

Devmgr.prototype.loadDevs = function (callback) {
	var self = this,
        deferred = Q.defer(),
		dev,
		loadServFuncs = [];

	bledb.getInfo('device').then(function (devsInfo) {
		_.forEach(devsInfo, function (devInfo) {
			dev = new BleDevice(devInfo.role, devInfo.addr, devInfo.addrType);
            if (devInfo.sm) { dev.sm = new Secmdl(devInfo.sm); }
			loadServFuncs.push(dev.loadServs.bind(dev));
		});
        return bleutil.seqResolveQFuncs(loadServFuncs);
	}).then(function (devs) {
        // dev.reConnect();
        deferred.resolve(devs);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Devmgr.prototype.findDev = function (addrOrHdl) { //TODO
	var obj = {},
		devsArr = [];

	if (_.isString(addrOrHdl)) { 
		devsArr =  this.connDevs.concat(this.discDevs);
		obj.addr = addrOrHdl;
	}
	if (_.isNumber(addrOrHdl)) {
		devsArr = this.connDevs;
		obj.connHdl = addrOrHdl;
	}

	return _.find(devsArr, obj);
};

function DiscDevice (addr, addrType) {
	this.ownerDevmgr = null;
	this.addr = addr;
	this.addrType = addrType;
}

DiscDevice.prototype.connect = function (callback) {
	var self = this,
		deferred = Q.defer(),
		connInfo = {},
		devmgr = this.ownerDevmgr;

	ccBnp.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
		connInfo.state = 'online';
		connInfo.connHdl = result[1].GapLinkEstablished.connHandle;
		connInfo.linkParams = {
			interval: result[1].GapLinkEstablished.connInterval, 
			latency: result[1].GapLinkEstablished.connLatency, 
			timeout: result[1].GapLinkEstablished.connTimeout
		};

		return self.ownerDevmgr.newDevice('peripheral', self.addr, self.addrType, connInfo);	
	}).then(function (result) {
		delete devmgr.discDevs[_.indexOf(devmgr.discDevs, self)];
		deferred.resolve(result);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

function BleDevice (role, addr, addrType, connInfo) {
	this._id = addr.slice(2);
	this._isSync = false;
	this.role = role; //central, peripherial
	this.addr = addr;
	this.addrType = addrType;
	this.state = 'offline'; //online, offline
	this.connHdl = null;
	this.linkParams  = null;
	this.servs = [];
	this.sm = null;

	if (connInfo) {
		this.state = connInfo.state;
		this.connHdl = connInfo.connHdl;
		this.linkParams  = connInfo.linkParams;
	}
}

BleDevice.prototype.reConnect = function (callback) {
	var self = this,
		deferred = Q.defer(),
		oldState = this.state,
		connInfo;

	ccBnp.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
		connInfo = result[1].GapLinkEstablished;
		self.state = 'online';
		self.connHdl = connInfo.connHandle;
		self.linkParams = {
			interval: connInfo.connInterval, 
			latency: connInfo.connLatency, 
			timeout: connInfo.connTimeout
		};

		return self.update();
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

	ccBnp.gap.terminateLink(this.connHdl, 19).then(function () {
		self.state = 'offline';
		self.connHdl = null;
		// update database
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
			self.servs.push(service);
			getCharFuncs.push(service.getChars());
		});

		return Q.all(getCharFuncs);
	}).then(function () {
		deferred.resolve(self);
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

BleDevice.prototype.expInfo = function () {
	var self = this,
		servs = [],
		sm = null;

	_.forEach(this.servs, function (serv) {
		servs.push(serv.uuid);
	});

	if (this.sm) {
		sm = {			
			pairMode: self.sm.pairMode,
			ioCap: self.sm.ioCap,
			mitm: self.sm.mitm,
			bond: self.sm.bond
		};
	}

	return {
		_id: this._id,
		role: this.role,
		addr: this.addr,
		addrType: this.addrType,
		linkParams: this.linkParams,
		servs: servs,
		sm: sm
	};
};

BleDevice.prototype.loadServs = function (callback) {
	var self = this,
		deferred = Q.defer(),
		serv,
		loadCharFuncs = [];

	bledb.getInfo('service').then(function (servsInfo) {
        servsInfo = _.filter(servsInfo, function (servInfo) {
            return servInfo.owner === self._id;
        });

		_.forEach(servsInfo, function (servInfo) {
			serv = new Service(servInfo);
			serv.ownerDev = self;
			serv._id = servInfo._id;
            self.servs.push(serv);
			loadCharFuncs.push(serv.loadChars.bind(serv));
		});

		return bleutil.seqResolveQFuncs(loadCharFuncs);
	}).then(function () {
		deferred.resolve(self);
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.update = function (callback) {
    var deferred = Q.defer(),
        updateServFuncs = [];

    _.forEach(this.servs, function (serv) {
        updateServFuncs.push(serv.update.bind(serv));
    });
    bleutil.seqResolveQFuncs(updateServFuncs).then(function (result) {
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BleDevice.prototype.save = function (callback) {
	var self = this,
		deferred = Q.defer(),
		devInfo = this.expInfo(),
		saveServFuncs = [];

	bledb.saveDevInfo(devInfo).then(function (doc) {
		_.forEach(self.servs, function (serv) {
			saveServFuncs.push(serv.save.bind(serv));
		});
		return bleutil.seqResolveQFuncs(saveServFuncs);
	}).then(function () {
		self._isSync = true;
		deferred.resolve();
	}).fail(function (err) {
		self._isSync = false;
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

BleDevice.prototype.remove = function (callback) {

};

BleDevice.prototype.checkOnline = function (callback) {
	
};

module.exports = Devmgr;