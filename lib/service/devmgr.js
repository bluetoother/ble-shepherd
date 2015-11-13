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

    this.bleDevices = [];
    this.discDevices = [];
}

Devmgr.prototype.newDevice = function (role, addr, addrType) {
    var deferred = Q.defer(),
        dev = this.findDev(addr);

    if (!dev) {
        dev = new BleDevice(role, addr, addrType);
        dev.ownerDevmgr = this;
        this.bleDevices.push(dev);
    }

    return dev;
};

Devmgr.prototype.loadDevs = function (callback) {
    var self = this,
        deferred = Q.defer(),
        dev,
        loadServFuncs = [];

    bledb.getInfo('device').then(function (devsInfo) {
        _.forEach(devsInfo, function (devInfo) {
            dev = self.newDevice(devInfo.role, devInfo.addr, devInfo.addrType);
            dev.state = 'offline';
            if (devInfo.sm) { dev.sm = dev.createSecMdl(devInfo.sm); }
            loadServFuncs.push(dev.loadServs.bind(dev));
        });
        return bleutil.seqResolveQFuncs(loadServFuncs);
    }).then(function (devs) {
        deferred.resolve(devs);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Devmgr.prototype.findDev = function (addrOrHdl) { 
    var obj = {},
        devsArr = [];

    if (_.isString(addrOrHdl)) {
        obj.addr = addrOrHdl;
    }
    if (_.isNumber(addrOrHdl)) {
        obj.connHdl = addrOrHdl;
    }

    return _.find(this.bleDevices, obj);
};

function BleDevice (role, addr, addrType, connInfo) {
    this._id = addr.slice(2);
    this._isSync = false;

    this.ownerDevmgr = null;
    this.role = role; //central, peripheral
    this.addr = addr;
    this.addrType = addrType;
    this.state = 'disc'; //disc, online, offline
    this.connHdl = null;
    this.linkParams  = null;
    this.servs = {};
    this.sm = null;

    if (connInfo) {
        this.state = connInfo.state;
        this.connHdl = connInfo.connHdl;
        this.linkParams  = connInfo.linkParams;
    }
}

BleDevice.prototype.connect = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldState = this.state,
        connInfo,
        timeout;

    timeout = setTimeout(function () {
        self.cancelConnect();
    }, 3000);

    ccBnp.gap.estLinkReq(0, 0, this.addrType, this.addr).then(function (result) {
        if (result[1].GapLinkEstablished.addr === '0x000000000000') {
            return 'timeout';
        } else {
            clearTimeout(timeout);
            self.state = 'online';
            connInfo = result[1].GapLinkEstablished;
            self.connHdl = connInfo.connHandle;
            self.linkParams = {
                interval: connInfo.connInterval, 
                latency: connInfo.connLatency, 
                timeout: connInfo.connTimeout
            };

            if (oldState === 'disc') { 
                return  self.getServs().then(function () {
                    return self.save();
                }); 
            }
            if (oldState === 'offline') { return self.update(); }
        }
    }).then(function (result) {
        if (result === 'timeout') {
            self._isSync = false;
            deferred.reject(new Error('connect timeout'));
        }else {
            console.log('connect over');
            self._isSync = true;
            deferred.resolve(self);
        }
    }).fail(function (err) {
        self._isSync = false;
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

BleDevice.prototype.cancelConnect = function (callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.terminateLink(65534, 19).then(function () {
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
                        uuid: servObj['attrVal' + i]
                    });
                }
            }
        });

        _.forEach(servsInfo, function (servInfo) {
            var servName;

            if ( servInfo.uuid.length ===  34) {
                servName = '0x' + servInfo.uuid.slice(6, 10);
            } else {
                servName = servInfo.uuid;
            }
            service = new Service(servInfo);
            service.ownerDev = self;
            self.servs[servName] = service;
            getCharFuncs.push(service.getChars.bind(service));
        });

        return bleutil.seqResolveQFuncs(getCharFuncs);
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

    if (setting.ltk && (setting.ltk !== new Buffer(16).fill(0))) {
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
        deferred = Q.defer();

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

    if (this.sm) { sm = self.sm.expInfo(); }

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
            return _.isEqual(servInfo.owner, self._id);
        });

        _.forEach(servsInfo, function (servInfo) {
            serv = new Service(servInfo);
            serv.ownerDev = self;
            serv._id = servInfo._id;
            if (servInfo.uuid.length === 34) { servInfo.uuid = '0x' + servInfo.uuid.slice(6, 10); }
            self.servs[servInfo.uuid] = serv;
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
    var self = this,
        deferred = Q.defer(),
        updateServFuncs = [];

    _.forEach(this.servs, function (serv) {
        updateServFuncs.push(serv.update.bind(serv));
    });
    bleutil.seqResolveQFuncs(updateServFuncs).then(function (result) {
        self._isSync = true;
        deferred.resolve(result);
    }).fail(function (err) {
        self._isSync = false;
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
        deferred.resolve(self);
    }).fail(function (err) {
        self._isSync = false;
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

BleDevice.prototype.remove = function (callback) {
    var self = this,
        deferred = Q.defer(),
        bleDevs = this.ownerDevmgr.bleDevices;

    bledb.remove('device', this._id).then(function () {
        return bledb.remove('service', self._id);
    }).then(function () {
        return bledb.remove('characteristic', self._id);
    }).then(function () {
        delete bleDevs[_.indexOf(bleDevs, self)];
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

function BleCentral (addr) {
    this.role = 'central';
    this.addr = addr;
    this.servs = {};
}

BleCentral.prototype.regServ = function () {

};

module.exports = Devmgr;