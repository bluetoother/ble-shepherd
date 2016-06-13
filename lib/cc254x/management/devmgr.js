'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccbnp = require('cc-bnp');

var Service = require('./service'),
    Secmdl = require('./secmdl'),
    bledb = require('../bledb'),
    bleutil = require('../../util/bleutil'),
    GATTDEFS = require('../../defs/gattdefs');

function Devmgr () {
    this._discDevs = [];
    this._syncDevs = [];

    this.bleDevices = [];
}

Devmgr.prototype.newDevice = function (role, addr, addrType) {
    var dev;

    if (role !== 'central' && role !== 'peripheral') {
        throw new Error('role input error');
    }
    if (!_.isString(addr) || !_.startsWith(addr, '0x') || _.size(addr) !== 14) {
        throw new Error('addr input error');
    }
    if (role === 'peripheral' && !_.isNumber(addrType)) { 
        throw new TypeError('addrType must ba a number'); 
    }

    dev = this.findDev(addr);
    if (!dev) {
        if (role === 'central') {
            dev = new BleCentral(addr);
        } else if (role === 'peripheral' && !dev) {
            dev = new BlePeriph(addr, addrType);
            dev._ownerDevmgr = this;
            this.bleDevices.push(dev);
        }
    }

    return dev;
};

Devmgr.prototype.findDev = function (addrOrHdl) { 
    var obj = {};

    if (!_.isString(addrOrHdl) && !_.isNumber(addrOrHdl)) {
        throw new TypeError('addrOrHdl must be a string or a number');
    }

    if (_.isString(addrOrHdl)) {
        obj.addr = addrOrHdl.toLowerCase();
    }
    if (_.isNumber(addrOrHdl)) {
        obj.connHdl = addrOrHdl;
    }

    return _.find(this.bleDevices, obj);
};

Devmgr.prototype.pausePeriph = function () {
    var deferred = Q.defer(),
        onlineNum = 0,
        onlinePeriph;

    onlinePeriph = _.find(this.bleDevices, {state: 'online'});

    if (onlinePeriph) {
        onlinePeriph.disconnect().then(function () {
            onlinePeriph.state = 'pause';
            deferred.resolve(onlinePeriph.addr);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.reject(new Error('No on-line device.'));
    }

    return deferred.promise;
};

Devmgr.prototype.loadPeriphs = function () {
    var self = this,
        deferred = Q.defer(),
        periph,
        loadServFuncs = [];

    bledb.getInfo('device').then(function (periphsInfo) {
        _.forEach(periphsInfo, function (periphInfo) {
            try {
                periph = self.newDevice(periphInfo.role, periphInfo.addr, periphInfo.addrType);
                periph.state = 'offline';
                if (periphInfo.sm) { periph.sm = periph.createSecMdl(periphInfo.sm); }
                loadServFuncs.push(periph.loadServs.bind(periph));
            } catch (e) {
                console.log('Can not load ' + periphInfo.addr + ' device with error: ' + e + '.');
            }
        });
        return bleutil.seqResolveQFuncs(loadServFuncs);
    }).then(function (devs) {
        deferred.resolve(devs);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Devmgr.prototype._stopScan = function () {
    var deferred = Q.defer();

    ccbnp.gap.deviceDiscCancel().then(function (result) {
        deferred.resolve();
    }).fail(function (err) {
        deferred.resolve();
    }).done();

    return deferred.promise;
};

function BlePeriph (addr, addrType) {
    this._ownerDevmgr = null;
    this._id = addr.slice(2);

    this.role = 'peripheral';
    this.addr = addr;
    this.addrType = addrType;
    this.state = 'disc'; //disc, online, offline, pause
    this.connHdl = null;
    this.linkParams  = null;
    this.servs = {};
    this.sm = null;
    this.name = null;
}

BlePeriph.prototype.getServs = function () {
    var self = this,
        deferred = Q.defer(),
        servObj,
        service,
        servsInfo = [],
        getCharFuncs = [];

    ccbnp.gatt.discAllPrimaryServices(this.connHdl).then(function (result) {
        _.forEach(result.collector.AttReadByGrpTypeRsp, function (evtObj) {
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
            service._ownerDev = self;
            self.servs[servName] = service;
            getCharFuncs.push(service.getChars.bind(service));
        });

        return bleutil.seqResolveQFuncs(getCharFuncs);
    }).then(function (result) {
        deferred.resolve(self.servs);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

BlePeriph.prototype.loadServs = function () {
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
            serv._ownerDev = self;
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
    }).done();

    return deferred.promise;
};

BlePeriph.prototype.connect = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldState = this.state,
        connInfo,
        timeout;

    timeout = setTimeout(function () {
        ccbnp.gap.terminateLink(65534, 19).fail(function () {}).done();
    }, 1500);

    if (this.state === 'online') {
        deferred.reject(new Error('Device is already online.'));
    } else {
        this._ownerDevmgr._stopScan().then(function () {
            return ccbnp.gap.estLinkReq(0, 0, self.addrType, self.addr);
        }).then(function (result) {
            if (result.collector.GapLinkEstablished[0].addr === '0x000000000000') {
                deferred.reject(new Error('connect timeout'));
            } else {
                clearTimeout(timeout);
                deferred.resolve();
            }
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.disconnect = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is already offline.'));
    } else {
        this._ownerDevmgr._stopScan().then(function () {
            return ccbnp.gap.terminateLink(self.connHdl, 19);
        }).then(function (result) {
            self.state = 'offline';
            self.connHdl = null;
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.updateLinkParam = function (interval, latency, timeout, callback) {
    var deferred = Q.defer();

    if (!_.isNumber(interval) || !_.isNumber(latency) || !_.isNumber(timeout)) {
        throw new Error('interval, latency and timeout must be number.');
    } 

    if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else {
        ccbnp.gap.updateLinkParamReq(this.connHdl, interval, interval, latency, timeout).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.createSecMdl = function (setting) {
    var self = this;

    if (!_.isPlainObject(setting)) { 
        throw new TypeError('setting must be an object'); 
    }

    if (!this.sm) {
        this.sm = new Secmdl(setting);
        this.sm._ownerDev = this;

        if (setting.ltk && (setting.ltk !== new Buffer(16).fill(0))) {
            this.sm.state = 'encrypted';
        }
    } 

    if (setting) {
        _.forEach(setting, function (val, key) {
            if (self.sm[key]) { self.sm[key] = val; }
        });
    }
    return this.sm;
};

BlePeriph.prototype.encrypt = function (setting, callback) { 
    var self = this,
        deferred = Q.defer();

    if (_.isFunction(setting)) {
        callback = setting;
        setting = null;
    } else if (setting && !_.isPlainObject(setting)) {
        throw new TypeError('setting must be an object');
    }

    if (!this.sm) { 
        this.sm = new Secmdl(setting); 
        this.sm._ownerDev = this; 
    } else if (setting) {
        _.forEach(setting, function (val, key) {
            if (this.sm[key]) { this.sm[key] = val; }
        });
    }

    if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else {
        this.sm.init().then(function () {
            return self.sm.pairing();
        }).then(function (result) {
            self.sm.state = 'encrypted';
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
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.passPasskey = function (passey, callback) {
    var deferred = Q.defer();

    if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else { 
        this.sm.passPasskey(passey).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.expInfo = function () {
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

BlePeriph.prototype.update = function (callback) { 
    var self = this,
        deferred = Q.defer(),
        notUpdate = ['0x1800', '0x1801', '0x180a'],
        updateServFuncs = [];

    _.forEach(this.servs, function (serv, servName) {
        if (!_.includes(notUpdate, servName)) {
            updateServFuncs.push(serv.update.bind(serv));
        }
    });

    if (this.state === 'pause') {
        deferred.reject(new Error('Device is not online.'));
    } else { 
        bleutil.seqResolveQFuncs(updateServFuncs).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.save = function () {
    var self = this,
        deferred = Q.defer(),
        periphInfo = this.expInfo(),
        saveServFuncs = [];

    bledb.saveInfo('device', periphInfo).then(function (doc) {
        _.forEach(self.servs, function (serv) {
            saveServFuncs.push(serv.save.bind(serv));
        });
        return bleutil.seqResolveQFuncs(saveServFuncs);
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

BlePeriph.prototype.remove = function (callback) { 
    var self = this,
        deferred = Q.defer(),
        bleDevs = this._ownerDevmgr.bleDevices;

    if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else { 
        this.disconnect().then(function () {
            return self.removeFromDb();
        }).then(function () {
            bleDevs.splice(_.indexOf(bleDevs, self), 1);
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.removeFromDb = function () {
    var self = this,
        deferred = Q.defer();

    return bledb.remove('device', this._id);
};

BlePeriph.prototype.dump = function () {
    var servs = {};

    _.forEach(this.servs, function (serv, uuid) {
        servs[uuid] = _.keys(serv.chars);
    });

    return {
        addr: this.addr,
        addrType: this.addrType,
        state: this.state,
        connHdl: this.connHdl,
        servList: servs
    };
};

/****Characteristic****/
BlePeriph.prototype.findChar = function (uuidServ, uuidChar) {
    var serv,
        servUuid,
        charUuid;

    if (!_.isString(uuidServ) || !_.startsWith(uuidServ, '0x')) {
        throw new Error('uuidServ must be a string and start with 0x');
    } else if (!_.isString(uuidChar) || !_.startsWith(uuidChar, '0x')) {
        throw new Error('uuidChar must be a string and start with 0x');
    }

    servUuid = uuidServ.toLowerCase();
    charUuid = uuidChar.toLowerCase();

    if (this.servs[servUuid]) { serv = this.servs[servUuid]; }
    if (serv) {
        return serv.chars[charUuid];
    } else {
        return;
    }
};

BlePeriph.prototype.read = function (uuidServ, uuidChar, callback) { 
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) {
        deferred.reject(checkErr);
    } else if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else if (!char) {
        deferred.reject(new Error('Can not find characteristic.'));
    } else {
        char.read().then(function (result) {
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.write = function (uuidServ, uuidChar, value, callback) { 
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) {
        deferred.reject(checkErr);
    } else if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else if (!char) {
        deferred.reject(new Error('Can not find characteristic.'));
    } else {
        char.write(value).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.readDesc = function (uuidServ, uuidChar, callback) { 
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) {
        deferred.reject(checkErr);
    } else if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else if (!char) {
        deferred.reject(new Error('Can not find characteristic.'));
    } else {
        char.readDesc().then(function (result) {
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.setNotify = function (uuidServ, uuidChar, config, callback) { 
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) {
        deferred.reject(checkErr);
    } else if (this.state === 'pause' || this.state === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else if (!char) {
        deferred.reject(new Error('Can not find characteristic.'));
    } else {
        char.setConfig(config).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BlePeriph.prototype.regCharHdlr = function (uuidServ, uuidChar, fn) {
    var char = this.findChar(uuidServ, uuidChar);

    if (!_.isFunction(fn)) { throw new TypeError('fn must be a function'); }
    
    if (char) {
        char.processInd = fn;
    }

    return this;
};

function BleCentral (addr) {
    this.role = 'central';
    this.addr = addr;
    this.servs = [];
}

BleCentral.prototype.regServ = function (bleServ) {
    var self = this,
        deferred = Q.defer(),
        attrs,
        numAttrs,
        permit = 0,
        addAttrFuncs = [];

    if (!_.isObject(bleServ) || _.isArray(bleServ)) {
        deferred.reject(new TypeError('bleServ must be an object'));
    } else {
        attrs = bleServ.getAttrs();
        numAttrs = _.size(attrs) + 1;

        ccbnp.gatt.addService('0x2800', numAttrs).then(function (result) {
            _.forEach(attrs, function (attr) {
                _.forEach(attr.permit, function (permitName) {
                    permit += GATTDEFS.Permit.get(permitName).value;
                });
                addAttrFuncs.push(ccbnp.gatt.addAttribute(attr.uuid, permit));
                permit = 0;
            });
            return Q.all(addAttrFuncs);
        }).then(function (result) {
            var hdlBuf;
            hdlBuf = _.last(result).payload;
            bleServ.startHdl = hdlBuf.readUInt16LE(0);
            bleServ.endHdl = hdlBuf.readUInt16BE(1);
            try {
                bleServ._assignHdls();
            } catch (err) {
                deferred.reject(err);
            }
            self.servs.push(bleServ);
            deferred.resolve(bleServ);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise;
};

BleCentral.prototype.delServ = function (hdl, callback) {
    var self = this,
        deferred = Q.defer();

    if (!_.isNumber(hdl)) {
        deferred.reject(new TypeError('hdl must be a number'));
    } else {
        ccbnp.gatt.delService(hdl).then(function (result) {
            _.forEach(self.servs, function (serv) {
                if (serv.startHdl === hdl) { self.servs.splice(_.indexOf(self.servs, serv), 1); }
            });
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BleCentral.prototype.processAttMsg = function (attMsg) {
    var deferred = Q.defer(),
        servs = [],
        attrs = [],
        attr,
        char,
        reqConnHdl = attMsg.data.connHandle,
        reqStartHdl = attMsg.data.startHandle,
        reqEndHdl = attMsg.data.endHandle,
        reqHdl = attMsg.data.handle,
        reqUuid = attMsg.data.type,
        reqVal,
        rspObj = {},
        uuidObj;

    _.forEach(this.servs, function (serv) {
        var servAttrs = serv.getAttrs();
        attrs = attrs.concat(servAttrs);
    });

    switch (attMsg.evtName) {
        case 'AttExchangeMtuReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x02, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttFindInfoReq':
            attrs = _.filter(attrs, function (attr) {
                return  (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
            });
            attrs = _.sortBy(attrs, ['hdl']);
            _.forEach(attrs, function (attr, i) {
                rspObj['handle' + i] = attr.hdl;
                rspObj['uuid' + i] = attr.uuid;
            });
            ccbnp.att.findInfoRsp(reqConnHdl, 1, rspObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
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
                    ccbnp.att.errorRsp(reqConnHdl, 0x06, 0x0001, 0x0A);
                    deferred.resolve();
                } else {
                    ccbnp.att.findByTypeValueRsp(reqConnHdl, rspObj, reqUuid).then(function () {
                        deferred.resolve();
                    }).fail(function (err) {
                        deferred.reject(err);
                    }).done();
                }
            } else {
                ccbnp.att.errorRsp(reqConnHdl, 0x06, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            } 
            break;
        case 'AttReadByTypeReq': 
            if (!GATTDEFS.CharUuid.get(_.parseInt(reqUuid, 16))) {
                ccbnp.att.errorRsp(reqConnHdl, 0x08, 1, 14);
                deferred.reject(new Error('Characteristic: ' + reqUuid + ' not register.'));
            } else {
                attrs = _.filter(attrs, function (attr) {
                    return (attr.uuid === reqUuid) && (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
                });
                attrs = _.sortBy(attrs, ['hdl']);
                _.forEach(attrs, function (attr, i) {
                    rspObj['attrHandle' + i] = attr.hdl;
                    rspObj['attrVal' + i] = attr.val;
                });
                ccbnp.att.readByTypeRsp(reqConnHdl, _.size(rspObj), rspObj , reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadReq': 
            attr = _.find(attrs, {hdl: reqHdl});
            if (!GATTDEFS.CharUuid.get(_.parseInt(attr.uuid, 16))) {
                ccbnp.att.errorRsp(reqConnHdl, 0x0a, reqHdl, 14);
                deferred.reject(new Error('Characteristic: ' + attr.uuid + ' not register.'));
            } else {
                ccbnp.att.readRsp(reqConnHdl, attr.val, attr.uuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadBlobReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x0c, reqHdl, 0x0B);
            deferred.resolve();
            break;
        case 'AttReadMultiReq': //TODO, uuid not register, 0x0e
            reqHdl = _.values(attMsg.data);
            _.forEach(attrs, function (attr) {
                _.forEach(reqHdl, function (hdl, i) {
                    if (attr.hdl === hdl) {
                        rspObj[attr.hdl] = attr.val;
                        uuidObj['uuid' + i] = attr.uuid;
                    }
                });
            });
            ccbnp.att.readMultiRsp(reqConnHdl, rspObj, uuidObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
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
                ccbnp.att.readByGrpTypeRsp(reqConnHdl, 6, rspObj, reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            } else {
                ccbnp.att.errorRsp(reqConnHdl, 0x10, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            }
            break;
        case 'AttWriteReq': 
            attr = _.find(attrs, {hdl: reqHdl});
            attr.val = attMsg.data.value;

            _.forEach(this.servs, function (serv) {
                var result;
                result = serv.findChar(attr.hdl);
                if (result) { char = result; }
            });

            if (!char) {
                deferred.reject('Can not find Characteristic');
            } else {
                if (attr.uuid === '0x2902') {
                    if (attr.val === 0x0001) { char.onIndMessage('notif'); }
                    if (attr.val === 0x0002) { char.onIndMessage('ind'); }
                } else {
                    char.onMessage(attr.uuid, attMsg.data);
                }
                
                ccbnp.att.writeRsp(reqConnHdl).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        //TODO
        case 'AttPrepareWriteReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x16, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttExecuteWriteReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x18, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;

        default:
            deferred.reject(new Error('Unable to handle this command.'));
            break;
    }

    return deferred.promise;
};

module.exports = new Devmgr();