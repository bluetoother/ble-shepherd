'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

var NwkScanner = require('./management/nwkScanner'),
    sysmgr = require('./management/sysmgr'),
    Devmgr = require('./management/devmgr'),
    bleutil = require('./util/bleutil'),
    BDEFS = require('./defs/bledefs'),
    GATTDEFS = require('./defs/gattdefs'),
    servConstr = require('./service/bleServConstr');

var scanEmptyCount = 0;

function BShepherd () {
    this.sysmgr = sysmgr;
    this.nwkScanner = new NwkScanner();
    this.devmgr = new Devmgr();

    this.bleCentral = null;

    this.app = function () {};
    this.preExec = function () {};
    this.setScanRule = function () {};
    this.connSpinLock = 'off';
}

util.inherits(BShepherd, EventEmitter);
var bShepherd = new BShepherd();

BShepherd.prototype.start = function (spConfig, bleApp) {
    var self = this;

    if (!_.isPlainObject(spConfig) || _.isUndefined(spConfig.path)) {
        throw new Error('spConfig must be an object and should have path property');
    }
    ccBnp.init(spConfig, 'central').then(function () {
        if (bleApp)
            self.app = bleApp;
    });

    return this;
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
                    ccBnp.regCharMeta(regObj);
                } catch (err) {
                    errObj.uuid.push(regObj.uuid);
                }
            }
        }
        errFlag = false;
    }); 

    return errObj;
};

BShepherd.prototype.addLocalServ = function (bleServ, callback) {
    var deferred = Q.defer();

    if (!(bleServ instanceof servConstr)) {
        deferred.reject(new Error('Service object must instance of bleServConstr module.'));
    } else if (!this.bleCentral) {
        deferred.reject(new Error('You must connect to the local side host.'));
    } else if (this.bleCentral && _.indexOf(this.bleCentral.servs, bleServ) !== -1) {
        deferred.reject(new Error('Local service already exist. You need to delete the old before add a new.'));
    } else {
        this.bleCentral.regServ(bleServ).then(function (result) {
            bleServ._isRegister = true;
            ccBnp.regUuidHdlTable(bleServ.expUuidHdlTable());
            console.log('>> Local service registered!');
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }        

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.callBleCmd = function (subGroup, cmd, argInst, callback) {
    var deferred = Q.defer();

    ccBnp[subGroup][cmd](argInst, callback).then(function (result) {
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

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
        connectDevFuncs = [];

    console.log('>> Central has completed initialization');
    try {
        central = bShepherd.devmgr.newDevice('central', msg.devAddr);
        bShepherd.bleCentral = central;
        bShepherd.devmgr.bleDevices.push(central); 
    } catch (e) {
        console.log('Can not create central with error: ' + e + '.');
    }

    bShepherd.preExec();
    bShepherd.nwkScanner.setScanParams({time: 3000});
    console.log('>> Loading devices from database.');
    bShepherd.devmgr._loadDevs().then(function (devs) {
        console.log('>> Asynchrnously connect devices in database.');
        _.forEach(devs, function (dev) {
            connectDevFuncs.push(function () {
                var deferred = Q.defer();
                dev.connect().then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    dev.remove().then(function () {
                        deferred.resolve();
                    });
                }).done();
                return deferred.promise;
            });
        });
        
        return bleutil.seqResolveQFuncs(connectDevFuncs);
    }).then(function () {
        bShepherd._regUuidHdlTable();
        applyScanRule(scanEmptyCount);
        bShepherd.app();
        console.log('>> Starting bleApp.');
    }).fail(function (err) {
        console.log('Problem occurs when starting bleApp:');
        console.log(err);
    }).done();
}

function nwkScannerEvtHdlr (msg) {
    var dev,
        devsInfo,
        discDevNum = 0;

    if (msg.type === 'STATE_CHANGE') {
        bShepherd.devmgr._scanState = msg.data;
    } else {
        console.log(msg);
        devsInfo = msg.data;
        bShepherd.nwkScanner.permitJoin(false);

        _.forEach(devsInfo, function (devInfo) {
            try {
                dev = bShepherd.devmgr.newDevice('peripheral', devInfo.addr, devInfo.addrType);
                if (dev.state === 'disc') {  // && dev.addr === '0x78c5e570796e'
                    discDevNum += 1;
                    connectDevice(dev); 
                }
            } catch (e) {
                console.log('Can not create a device with error: ' + e + '.');
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
            setTimeout(function () { processLinkEst(msg.data, dev); }, 10);
            break;
        case 'linkTerminated':
            processLinkTerm(msg.data, dev);
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

/*************************************************************************************************/
/*** ccBnp Event Handler                                                                       ***/
/*************************************************************************************************/
function processLinkEst (msg, dev) {
    var rebuildFlag = false;

    function getDevInfo () {
        if (rebuildFlag === true) {
            return dev._getServs().then(function () {
                return dev.save();
            });
        } else {
            return dev.update();
        }
    }

    if (!dev) {
        try {
            dev = bShepherd.devmgr.newDevice('peripheral', msg.addr, 0);
            rebuildFlag = true;
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

    getDevInfo().then(function () {
        dev.state = 'online';
        dev._isSync = true;
        console.log('Device: ' + dev.addr + ' join the network.');
        bShepherd.emit('IND', {type: 'DEV_INCOMING', data: msg.addr});
    }).fail(function (err) {
        dev.disconnect();
    }).done();
}

function processLinkTerm (msg, dev) {
    if (!dev) { return; }
    dev.state = 'offline';
    dev.connHdl = null;
    console.log('Device: ' + dev.addr + ' leave the network.');
    bShepherd.emit('IND', {type: 'DEV_LEAVING', data: msg.addr});
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
function connectDevice (dev) {
    if (bShepherd.connSpinLock === 'off') {
        bShepherd.connSpinLock = 'on';
        dev.connect().fail(function (err) {
            console.log('Device: ' + dev.addr + ' connect error with ' + err);
        }).finally(function () {
            bShepherd.connSpinLock = 'off';
            if (!_.isEmpty(bShepherd.devmgr.discDevices)) {
                process.nextTick(function () {
                    var nextDev = bShepherd.devmgr.discDevices.shift();
                    connectDevice(nextDev);
                });
            } else {
                bShepherd.emit('CONNECT_OVER');
            }
        });
    } else {
        if (!_.find(bShepherd.devmgr.discDevices, {addr: dev.addr})) {
            bShepherd.devmgr.discDevices.push(dev);
        }
    }
}

function applyScanRule (times) {
    var interval = 0;

    if (!_.isFunction(bShepherd.setScanRule)) {
        bShepherd.setScanRule = function () {};
    }

    if (times) {
        interval = bShepherd.setScanRule(times) || interval;
        setTimeout(function () {
            bShepherd.nwkScanner.permitJoin(true);
        }, interval);
    } else {
        if (!bShepherd.setScanRule()) {
            bShepherd.nwkScanner.permitJoin(true);
        }
    }
}

module.exports = bShepherd;