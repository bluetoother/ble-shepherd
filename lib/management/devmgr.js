'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var Service = require('./service'),
    Secmdl = require('./secmdl'),
    bledb = require('../bledb'),
    bleutil = require('../util/bleutil');

function Devmgr () {
    if (_.isObject(Devmgr.instance)) { return Devmgr.instance; }
    Devmgr.instance = this;

    this._scanState = 'off';
    this.bleDevices = [];
    this.discDevices = [];
}

Devmgr.prototype.newDevice = function (role, addr, addrType) {

    var deferred = Q.defer(),
        dev = this.findDev(addr);

    if (role === 'central') {
        dev = new BleCentral(addr);
    } else if (role === 'peripheral' && !dev) {
        dev = new BleDevice(addr, addrType);
        dev.ownerDevmgr = this;
        this.bleDevices.push(dev);
    }

    return dev;
};

Devmgr.prototype.stopScan = function (callback) {
    var deferred = Q.defer();

    if (this._scanState === 'off') {
        deferred.resolve();
    } else {
        ccBnp.gap.deviceDiscCancel().then(function () {
            deferred.resolve();
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
    var obj = {};

    if (_.isString(addrOrHdl)) {
        obj.addr = addrOrHdl;
    }
    if (_.isNumber(addrOrHdl)) {
        obj.connHdl = addrOrHdl;
    }

    return _.find(this.bleDevices, obj);
};

function BleDevice (addr, addrType, connInfo) {
    this._id = addr.slice(2);
    this._isSync = false;

    this.ownerDevmgr = null;
    this.role = 'peripheral';
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

    this.ownerDevmgr.stopScan().then(function () {
        return ccBnp.gap.estLinkReq(0, 0, self.addrType, self.addr);
    }).then(function (result) {
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
    var deferred = Q.defer();

    ccBnp.gap.updateLinkParamReq(this.connHdl, interval, interval, connLatency, connTimeout).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

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

    bledb.saveInfo('device', devInfo).then(function (doc) {
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
    this.servs = [];
}

BleCentral.prototype.regServ = function (bleServ, callback) {
    var self = this,
        deferred = Q.defer(),
        attrs = bleServ.getAttrs(),
        numAttrs = _.size(attrs) + 1,
        addAttrFuncs = [];

    ccBnp.gatt.addService('0x2800', numAttrs).then(function (result) {
        _.forEach(attrs, function (attr) {
            addAttrFuncs.push(ccBnp.gatt.addAttribute(attr.uuid, attr.permit));
        });
        return Q.all(addAttrFuncs);
    }).then(function (result) {
        var hdlBuf;
        hdlBuf = _.last(result)[0].GapCmdStatus.payload;
        bleServ.startHdl = hdlBuf.readUInt16LE(0);
        bleServ.endHdl = hdlBuf.readUInt16LE(1);
        try {
            bleServ.assignHdls();
        } catch (err) {
            deferred.reject(err);
        }
        self.servs.push(bleServ);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BleCentral.prototype.delServ = function (hdl, callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gatt.delService(hdl).then(function () {
        _.forEach(self.servs, function (serv) {
            if (serv.startHdl === hdl) { delete self.servs[_.indexOf(self.servs, serv)]; }
        });
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BleCentral.prototype.getAllAttrs = function () {
    var attrs = [];

    _.forEach(this.servs, function (serv) {
        var servAttrs = serv.getAttrs();
        attrs = attrs.concat(servAttrs);
    });

    return attrs;
};

BleCentral.prototype.processAttMsg = function (attMsg) {
    var self = this,
        deferred = Q.defer(),
        servs = [],
        attrs = this.getAllAttrs(),
        reqConnHdl = attMsg.data.connHandle,
        reqStartHdl = attMsg.data.startHandle,
        reqEndHdl = attMsg.data.endHandle,
        reqHdl = attMsg.data.handle,
        reqUuid = attMsg.data.type,
        reqVal,
        rspObj = {};
console.log(attMsg);
    switch (attMsg.evtName) {
        case 'AttFindInfoReq':
            attrs = _.filter(attrs, function (attr) {
                return  (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
            });
            attrs = _.sortByAll(attrs, ['hdl']);
            _.forEach(attrs, function (attr, i) {
                rspObj['handle' + i] = attr.hdl;
                rspObj['uuid' + i] = attr.uuid;
            });
            ccBnp.att.findInfoRsp(reqConnHdl, 1, rspObj);
            ccBnp.att.errorRsp(reqConnHdl, 0xFD04, reqHdl, 0x0A);
            //TODO, The Procedure Is Completed
            break;
        case 'AttFindByTypeValueReq': 
            if (reqUuid === '0x2800') {
                reqVal = bleutil.buf2Str(attMsg.data.value);
                _.forEach(this.servs, function (serv) {
                    if (serv.uuid === reqVal && (serv.startHdl >= reqStartHdl) && (serv.endHdl <= reqEndHdl)) {
                        rspObj.attrHandle0 = serv.startHdl;
                        rspObj.grpEndHandle0 = serv.endHdl;
                    }
                });
                if (_.isEmpty(rspObj)) { 
                    ccBnp.att.errorRsp(reqConnHdl, 0x06, 0x0001, 0x0A);
                } else {
                    ccBnp.att.findByTypeValueRsp(reqConnHdl, rspObj, reqUuid);
                    //TODO, The Procedure Is Completed
                }
            }
            break;
        case 'AttReadByTypeReq': 
            attrs = _.filter(attrs, function (attr) {
                return (attr.uuid === reqUuid) && (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
            });
            attrs = _.sortByAll(attrs, ['hdl']);
            _.forEach(attrs, function (attr, i) {
                rspObj['attrHandle' + i] = attr.hdl;
                rspObj['attrVal' + i] = attr.val;
            });
            ccBnp.att.readByTypeRsp(reqConnHdl, _.size(rspObj), rspObj , reqUuid);
            //TODO, The Procedure Is Completed
            break;
        case 'AttReadReq': 
            _.forEach(attrs,function (attr) {
                if (attr.hdl === reqHdl) {
                    ccBnp.att.readRsp(reqConnHdl, attr.val, attr.uuid); 
                }
            });
            break;
        case 'AttReadMultiReq': 
            reqHdl = _.values(attMsg.data);
            _.forEach(attrs, function (attr) {
                _.forEach(reqHdl, function (hdl) {
                    if (attr.hdl === hdl) {
                        rspObj[attr.uuid] = attr.val;
                    }
                });
            });
            ccBnp.att.readMultiRsp(reqConnHdl, rspObj);
            break;
        case 'AttReadByGrpTypeReq':
            if (reqUuid === '0x2800') {
                servs = _.filter(this.servs, function (serv) {
                    return (serv.startHdl >= reqStartHdl) && (serv.endHdl <= reqEndHdl);
                });

                _.forEach(servs, function (serv, i) {
                    rspObj['attrHandle' + i] = serv.startHdl;
                    rspObj['endGroupHandle' + i] = serv.endHdl;
                    rspObj['attrVal' + i] = bleutil.str2Buf(serv.uuid);
                });
                ccBnp.att.readByGrpTypeRsp(reqConnHdl, 6, rspObj, reqUuid);
                //TODO, The Procedure Is Completed
            }
            break;
        case 'AttWriteReq':
            _.forEach(attrs, function (attr) {
                var char;
                if (attr.hdl === reqHdl) {
                    attr.val = attMsg.data.value;
                    char = self.findChar(attr.hdl);
                    if (attr.uuid === '0x2902') {
                        if (attr.val === 0x0001) { char.onIndMessage('notif'); }
                        if (attr.val === 0x0002) { char.onIndMessage('ind'); }
                    } else {
                        char.onMessage(attMsg.data);
                    }
                    ccBnp.att.writeRsp(reqConnHdl);
                } 
            });
            break;
        //TODO
        case 'AttPrepareWriteReq':
            break;
        case 'AttExecuteWriteReq':
            break;

        default:
            break;
    }


    return deferred.promise.nodeify(callback);
};

module.exports = Devmgr;