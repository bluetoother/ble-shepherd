'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    process = require('process'),
    async = require('async-kit'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

var NwkScanner = require('./management/nwkScanner'),
    sysmgr = require('./management/sysmgr'),
    Devmgr = require('./management/devmgr'),
    bleutil = require('../util/bleutil'),
    BDEFS = require('../defs/bledefs'),
    GATTDEFS = require('../defs/gattdefs'),
    servConstr = require('./service/bleServConstr');

var scanEmptyCount = 0;

function BShepherd () {
    this._connSpinLock = 'off';
    this._syncSpinLock = 'off';
    this._connNum = 0;
    this.sysmgr = sysmgr;
    this.nwkScanner = new NwkScanner();
    this.devmgr = new Devmgr();

    this.bleCentral = null;

    this.app = function () {};
    this.appInit = function () {};
    this.setScanRule = function () {};
}

util.inherits(BShepherd, EventEmitter);
var bShepherd = new BShepherd();

BShepherd.prototype.start = function (spCfg, bleApp) {
    var self = this;

    if (!_.isPlainObject(spCfg) || _.isUndefined(spCfg.path)) {
        throw new Error('spConfig must be an object and should have path property');
    }

    ccBnp.init(spCfg, 'central').then(function () {
        if (bleApp)
            self.app = bleApp;
    });
    

    this.onSigninBind = this._onSignin.bind(this);
    process.on('SIGINT', this.onSigninBind);
    process.on('asyncExit', this.onAsyncExit.bind(this));

    return this;
};

BShepherd.prototype.reset = function (mode, callback) {
    var deferred = Q.defer(),
        cmdName;

    if (mode === 'soft') {
        cmdName = 'softReset';
    } else if (mode === 'hard') {
        cmdName = 'hardReset';
    }

    if (!cmdName) {
        deferred.reject(new TypeError('mode must be a string of soft or hard'));
    } else {
        this.sysmgr[cmdName]().then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.setNwkParams = function (type, setting, callback) {
    var deferred = Q.defer(),
        cmdName;

    if (type === 'scan') {
        cmdName = 'setScanParams';
    } else if (type === 'link') {
        cmdName = 'setLinkParams';
    }

    if (!cmdName) {
        deferred.reject(new TypeError('type must be a string of scan or link'));
    } else {
        this.nwkScanner[cmdName](setting).then(function (result) {
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.permitJoin = function (mode, callback) {
    var deferred = Q.defer();

    this.nwkScanner.permitJoin(mode).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.command = function (subGroup, cmd, argInst, callback) {
    var deferred = Q.defer();

    ccBnp[subGroup][cmd](argInst, callback).then(function (result) {
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.find = function (addrOrHdl) {
    return this.devmgr.findDev(addrOrHdl);
};

BShepherd.prototype.regGattDefs = function (type, regObjs) {
    var enumName,
        errFlag = false,
        enumNewMem = {},
        errObj = {
            name: [],
            uuid: []
        };

    if (type === 'service') {
        enumName = 'ServUuid'; 
    } else if (type === 'characteristic') { 
        enumName = 'CharUuid'; 
    } else {
        throw new Error('type must be service or characteristic.');
    }

    if (!_.isObject(regObjs)) { throw new TypeError('regObjs must be an object or an array'); }

    _.forEach(regObjs, function (regObj) {
        if (_.isString(regObj.uuid)) { regObj.uuid = _.parseInt(regObj.uuid, 16);}
        if (GATTDEFS[enumName].get(regObj.name)) { 
            errFlag = true;
            errObj.name.push(regObj.name); 
        } 
        if (GATTDEFS[enumName].get(regObj.uuid)) { 
            errFlag = true;
            errObj.uuid.push(regObj.uuid); 
        }

        if (!errFlag) {
            enumNewMem[regObj.name] = regObj.uuid;
            GATTDEFS[enumName] = bleutil.addEnumMember(enumNewMem, GATTDEFS[enumName]);

            if (type === 'characteristic' && !_.isEmpty(regObj.params) && !_.isEmpty(regObj.types)) {
                try {
                    ccBnp.regChar(regObj);
                } catch (err) {
                    errObj.uuid.push(regObj.uuid);
                }
            }
        }
        errFlag = false;
    }); 

    if (_.isEmpty(errObj.name)) { delete errObj.name; }
    if (_.isEmpty(errObj.uuid)) { delete errObj.uuid; }

    return errObj;
};

BShepherd.prototype.addLocalServ = function (servInfo, callback) {
    var deferred = Q.defer(),
        serv,
        checkErr;

    if (!servInfo || !_.isPlainObject(servInfo)) { 
        checkErr = new TypeError('servInfo must be an object'); 
    } else {
        if (!_.isArray(servInfo.charsInfo)) { checkErr = checkErr || new TypeError('servInfo.charsInfo must be an array.'); }
        if (!_.isString(servInfo.uuid) || !_.startsWith(servInfo.uuid, '0x')) {  
            checkErr = checkErr || new TypeError('servInfo.uuid must be a string and start with 0x');
        }
    }
    
    if (checkErr) {
        deferred.reject(checkErr);
    } else {
        serv = new servConstr(servInfo.uuid, servInfo.charsInfo, servInfo.name);

        if (_.indexOf(this.bleCentral.servs, serv) !== -1) {
            deferred.reject(new Error('Local service already exist. You need to delete the old before add a new.'));
        } else {
            this.bleCentral.regServ(serv).then(function (result) {
                serv._isRegister = true;
                ccBnp.regUuidHdlTable(serv.expUuidHdlTable());
                console.log('>> Local service registered!');
                deferred.resolve(result);
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
        }       
    }

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype._regUuidHdlTable = function () {
    var table = {};

    if (_.size(this.devmgr.bleDevices) <= 1) { return; }
    _.forEach(this.devmgr.bleDevices, function (dev) {
        if (dev.role === 'peripheral') {
            table[dev.connHdl] = {};
            _.forEach(dev.servs, function (serv) {
                _.forEach(serv.chars, function (char) {
                    table[dev.connHdl][char.hdl] = char.uuid;
                });
            });
        }
    });

    ccBnp.regUuidHdlTable(table);

    return table;
};

BShepherd.prototype._onSignin = function () {
    var sigIntListeners = process.listeners('SIGINT');

    if (sigIntListeners[sigIntListeners.length - 1] === this.onSigninBind) {
        async.exit();
    }
};

BShepherd.prototype.onAsyncExit = function (code, time, callback) {
    var self = this,
        disconnDevs = [];

    this.permitJoin(0);
    this.nwkScanner.cancelScan();
    this.devmgr._scanState = 'off';
    _.forEach(this.devmgr.bleDevices, function (dev) {
        if (dev.state === 'online') {
            disconnDevs.push(dev.disconnect.bind(dev));
        }
    });

    bleutil.seqResolveQFuncs(disconnDevs).then(function () {
        self.reset('hard');
    });
};

/*************************************************************************************************/
/*** Event Listeners                                                                           ***/
/*************************************************************************************************/
ccBnp.on('ready', bleInitDoneHdlr);
ccBnp.on('ind', ccBnpEvtHdlr);
bShepherd.nwkScanner.on('NS:IND', nwkScannerEvtHdlr);

/*************************************************************************************************/
/*** Event Handlers                                                                            ***/
/*************************************************************************************************/
function bleInitDoneHdlr (msg) {
    var central,
        onlineNum = 0,
        devCount = 0,
        connectDevFuncs = [],
        connDevs = [],
        pauseDevs = [];

    console.log('>> Central has completed initialization');
    try {
        central = bShepherd.devmgr.newDevice('central', msg.devAddr);
        bShepherd.bleCentral = central;
        bShepherd.devmgr.bleDevices.push(central); 
    } catch (e) {
        console.log('Can not create central with error: ' + e + '.');
    }

    bShepherd.appInit();
    bShepherd.nwkScanner.getScanParams().then(function () {
        return bShepherd.nwkScanner.getLinkParams();
    }).then(function () {
        return bShepherd.nwkScanner.setScanParams({time: 3000});
    }).then(function () {
        console.log('>> Loading devices from database.');
        return bShepherd.devmgr._loadDevs();
    }).then(function (devs) {
        console.log('>> Asynchrnously connect devices in database.');
        _.forEach(devs, function (dev) {
            connectDevFuncs.push(function () {
                var deferred = Q.defer();
                
                dev.connect().then(function () {
                    bShepherd.on('IND', function (msg) {
                        if (msg.type === 'DEV_INCOMING' && msg.data === dev.addr) {
                            connDevs.push(dev.addr);
                            onlineNum += 1;
                            devCount += 1;
                            if (onlineNum === 3 && devCount !== _.size(devs)) { 
                                bShepherd.devmgr.pauseDev().then(function (devAddr) {
                                    if (_.includes(connDevs, devAddr)) {
                                        connDevs.splice(_.indexOf(connDevs, devAddr), 1);
                                    }
                                    pauseDevs.push(devAddr);
                                    onlineNum -= 1;
                                    deferred.resolve();
                                }); 
                            } else {
                                deferred.resolve();
                            }
                        }
                    });
                }).fail(function (err) {
                    dev.removeFromDb().then(function () {
                        deferred.resolve();
                    });
                }).done();
                return deferred.promise;
            });
        });
        
        return bleutil.seqResolveQFuncs(connectDevFuncs);
    }).then(function () {
        bShepherd._regUuidHdlTable();
        bShepherd.permitJoin(60);
        bShepherd.app();
        emitDevInfo(connDevs, pauseDevs);
        console.log('>> Starting bleApp.');
    }).fail(function (err) {
        console.log('Problem occurs when starting central');
        console.log(err);
    }).done();
}

function nwkScannerEvtHdlr (msg) {
    var dev,
        devsInfo,
        discDevNum = 0;

    switch (msg.type) {
        case 'STATE_CHANGE':
            bShepherd.devmgr._scanState = msg.data;
            break;

        case 'DISC_DEV':
            devsInfo = msg.data;          
            if (bShepherd.nwkScanner.permitState === 'on') {
                bShepherd.nwkScanner.emit('stopScan');
                bShepherd.devmgr._scanState = 'off';
                _.forEach(devsInfo, function (devInfo) {
                    try {
                        dev = bShepherd.devmgr.newDevice('peripheral', devInfo.addr, devInfo.addrType);

                        if (dev.state !== 'pause' && dev.addr !== '0xd04f7e0100d4' && dev.addr !== '0x7cd1c3245f08' /*&& !_.startsWith(dev.addr, '0xd05fb820')*/) { 
                            discDevNum += 1;
                            connectDev(dev); 
                        }
                    } catch (e) {
                        console.log('Can not create a device with error: ' + e + '.');
                    }
                });

                if (discDevNum !== 0) {
                    bShepherd.once('CONNECT_OVER', function () {
                        if (bShepherd.nwkScanner.permitState === 'on') {
                            bShepherd.nwkScanner._contScan();
                            bShepherd.devmgr._scanState = 'on';
                        }
                    });
                } else {
                    if (bShepherd.nwkScanner.permitState === 'on') {
                        bShepherd.nwkScanner._contScan();
                        bShepherd.devmgr._scanState = 'on';
                    }
                }
            } else {
                _.forEach(devsInfo, function (devInfo) {
                    dev = bShepherd.find(devInfo.addr);
                    if (dev && dev.state !== 'pause') {
                        if (dev.addr !== '0xd04f7e0100d4' && dev.addr !== '0x7cd1c3245f08'/* && !_.startsWith(dev.addr, '0xd05fb820')*/) { 
                            discDevNum += 1;
                            connectDev(dev);
                        }
                    }
                });

                if (discDevNum !== 0) {
                    bShepherd.once('CONNECT_OVER', function () {
                        scanEmptyCount = 0;
                        applyScanRule(scanEmptyCount);
                    });
                } else {
                    scanEmptyCount += 1;
                    applyScanRule(scanEmptyCount);
                }
            }
            break;
    }
}

function ccBnpEvtHdlr (msg) {
    var dev;

    try {
        if (msg.type === 'linkEstablished') {
            dev = bShepherd.devmgr.findDev(msg.data.addr);
        } else if (msg.type !== 'attReq') {
            dev = bShepherd.devmgr.findDev(msg.data.connHandle);
        }
    } catch (e) {
        console.log('Can not find a device when receive ' + msg.type + 'event with error: ' + e + '.');
    }

    switch (msg.type) {
        case 'linkEstablished':
            if (msg.data.addr === '0x000000000000') { break; }
            bShepherd._connNum += 1;
            bShepherd.emit('IND', {type: 'DEV_ONLINE', data: msg.data});
            setTimeout(function () { processLinkEst(msg.data, dev); }, 10);
            break;
        case 'linkTerminated':
            bShepherd._connNum -= 1;
            setTimeout(function () { processLinkTerm(msg.data, dev); }, 10);
            break;
        case 'linkParamUpdate':
            processLinkParamUpdate(msg.data, dev);
            break;
        case 'attNoti':
        case 'attInd':
            processAttrInd(msg.type, msg.data, dev);
            break;
        case 'authenComplete':
            processAuthenComplete(msg.data, dev);
            break;
        case 'passkeyNeeded':
            bShepherd.emit('IND', {type: 'PASSKEY_NEED', data: msg.data});
            break;
        case 'bondComplete':
            processbBondComplete(msg.type, dev);
            break;
        case 'attReq':
            bShepherd.bleCentral._processAttMsg(msg.data).fail(function (err) {
                bShepherd.emit('IND', {type: 'LOCAL_SERV_ERR', data: {evtData: msg.data, err: err}});
            }).done();
            break;
        default:
            break;
    }
}

function emitDevInfo(connDevs, pauseDevs) {
    _.forEach(connDevs, function (devAddr) {
        bShepherd.emit('IND', {type: 'DEV_INCOMING', data: devAddr});
    });

    _.forEach(pauseDevs, function (devAddr) {
        bShepherd.emit('IND', {type: 'DEV_PAUSE', data: devAddr});
    });
}

/*************************************************************************************************/
/*** ccBnp Event Handler                                                                       ***/
/*************************************************************************************************/
function processLinkEst (msg, dev) {
    var rebuildFlag = false;

    if (!dev) {
        try {
            dev = bShepherd.devmgr.newDevice('peripheral', msg.addr, 0);
        } catch (e) {
            console.log('Can not create a device with error: ' + e + '.');
        }
    }

    if (dev.state === 'disc') { rebuildFlag = true; }
    dev.connHdl = msg.connHandle;
    dev.linkParams = {
        interval: msg.connInterval, 
        latency: msg.connLatency, 
        timeout: msg.connTimeout
    };

    if (dev.state !== 'pause') {
        syncDev(dev, rebuildFlag);
    }
}

function processLinkTerm (msg, dev) {
    if (!dev) { return; }

    dev.connHdl = null;
    if (dev.state === 'pause' || dev.state === 'disc') { return; }
    /*if (dev.state !== 'disc') { */dev.state = 'offline';/* }*/
    console.log('Device: ' + dev.addr + ' leave the network.');
    bShepherd.emit('IND', {type: 'DEV_LEAVING', data: dev.addr});
}

function processLinkParamUpdate (msg, dev) {
    if (!dev) { return; }
    dev.linkParams = {
        interval: msg.connInterval, 
        latency: msg.connLatency,
        timeout: msg.connTimeout
    };     
}

function processAttrInd (type, msg, dev) {
    if (!dev) { return; }
    _.forEach(dev.servs, function (serv) {
        _.forEach(serv.chars, function (char) {
            if (char.hdl === msg.handle) {
                char.indUpdate(msg.value);
                char.processInd(msg.value);
            }
        });
    });
    if (type === 'attInd') {
        ccBnp.att.handleValueCfm(msg.connHandle);
    }
    bShepherd.emit('IND', {type: 'ATT_IND', data: msg});
}

function processAuthenComplete (msg, dev) {
    if (!dev) { return; }
    if (msg.ltk !== new Buffer(16).fill(0)) {
        try {
            if (!dev.sm) { dev.createSecMdl(msg); }
            dev.sm.state = 'encrypted';
            dev.sm.update(msg);
        } catch (e) {
            console.log('Can not create security model with error: ' + e + '.');
        }
    }
}

function processbBondComplete (msg, dev) {
    if (!dev) { return; }
    dev.sm.bond = 'true';
    dev.sm.status = 'encrypted';
}

/*************************************************************************************************/
/*** Private Function                                                                          ***/
/*************************************************************************************************/
function connectDev (dev) {
    var timeout = 0;

    if (bShepherd._connSpinLock === 'off' && bShepherd._connNum < 3) {
        bShepherd._connSpinLock = 'on';
        dev.connect().fail(function (err) {
            console.log('Device: ' + dev.addr + ' connect error with ' + err);
        }).finally(function () {
            bShepherd._connSpinLock = 'off';
            if (!_.isEmpty(bShepherd.devmgr._discDevs)) {
                if (bShepherd._connNum >= 3) { timeout = 2000; }
                setTimeout(function () {
                    process.nextTick(function () {
                        var nextDev = bShepherd.devmgr._discDevs.shift();
                        connectDev(nextDev);
                    });
                }, timeout);
            } else {
                bShepherd.emit('CONNECT_OVER');
            }
        });
    } else {
        if (bShepherd._connNum >= 3) {
            bShepherd.devmgr.pauseDev().then(function (devAddr) {
                bShepherd.emit('IND', {type: 'DEV_PAUSE', data: devAddr});
                connectDev(dev);
            }).fail(function (err) {
                if (err.message === 'On-line device is not full.') {
                    setTimeout(function () {
                        connectDev(dev);
                    }, 3000);
                }
            }).done();
        } else if (!_.find(bShepherd.devmgr._discDevs, {addr: dev.addr})) {
            bShepherd.devmgr._discDevs.push(dev);
        }
    }
}

function syncDev (dev, flag) {
    function getDevInfo (rebuildFlag) {
        if (rebuildFlag === true) {
            return dev._getServs().then(function () {
                return dev.save();
            });
        } else {
            return dev.update();
        }
    }

    if (bShepherd._syncSpinLock === 'off') {
        bShepherd._syncSpinLock = 'on';
        getDevInfo(flag).then(function () {
            dev.state = 'online';
            dev._isSync = true;
            console.log('Device: ' + dev.addr + ' join the network.');
            bShepherd.emit('IND', {type: 'DEV_INCOMING', data: dev.addr});
        }).fail(function (err) {
            console.log('Device: ' + dev.addr + ' update GATT information failure with error: ' + err +'.');
            dev.disconnect();
        }).finally(function () {
            bShepherd._syncSpinLock = 'off';
            if (!_.isEmpty(bShepherd.devmgr._syncDevs)) {
                if (_.size(bShepherd.devmgr._discDevs !== 0)) {
                    bShepherd.devmgr.pauseDev().then(function (devAddr) {
                        bShepherd.emit('IND', {type: 'DEV_PAUSE', data: devAddr});
                    }).fail(function () {}).done();
                }
                process.nextTick(function () {
                    var nextDevInfo = bShepherd.devmgr._syncDevs.shift();
                    syncDev(nextDevInfo.dev, nextDevInfo.flag);
                });
            }
        }).done();
    } else {
        bShepherd.devmgr._syncDevs.push({dev: dev, flag: flag});
    }
}

function applyScanRule (times) {
    var interval = 3000;

    if (!_.isFunction(bShepherd.setScanRule)) {
        return;
    }

    interval = bShepherd.setScanRule(times) || interval;
    setTimeout(function () {
        bShepherd.nwkScanner.scan();
    }, interval);
}

module.exports = bShepherd;