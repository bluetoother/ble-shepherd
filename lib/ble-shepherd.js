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

function BShepherd (spConfig) {
    this.nwkScanner = new NwkScanner();
    this.sysmgr = sysmgr;
    this.devmgr = new Devmgr();
    this.spConfig = spConfig;

    this.bleCentral = null;

    this.app = function () {};
    this.preExec = function () {};
    this.connSpinLock = 'off';
}

util.inherits(BShepherd, EventEmitter);
var bShepherd = new BShepherd();

BShepherd.prototype.start = function (spConfig, bleapp) {
    var self = this;

    ccBnp.init(spConfig, 'central').then(function () {
        self.app = bleapp;
    });
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
        return new Error('type must be service or characteristic.');
    }

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

BShepherd.prototype._regUuidHdlTable = function () {
    var table = {};

    if (this.devmgr.bleDevices.length) { return; }
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
    central = bShepherd.devmgr.newDevice('central', msg.devAddr);
    bShepherd.bleCentral = central;
    bShepherd.devmgr.bleDevices.push(central);

    bShepherd.preExec();
    console.log('>> Loading devices from database.');
    bShepherd.devmgr.loadDevs().then(function (devs) {
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
        bShepherd.nwkScanner.permitJoin(true);
        bShepherd.devmgr._scanState = 'on';
        bShepherd.app();
        console.log('>> Starting bleApp.');
    }).fail(function (err) {
        console.log('Problem occurs when starting bleApp:');
        console.log(err);
    }).done();
}

function nwkScannerEvtHdlr (msg) {
    var dev,
        devsInfo = msg.data,
        discDevNum = 0;

    bShepherd.nwkScanner.permitJoin(false);
    bShepherd.devmgr._scanState = 'off';
    _.forEach(devsInfo, function (devInfo) {
        dev = bShepherd.devmgr.newDevice('peripheral', devInfo.addr, devInfo.addrType);
        if (dev.state === 'disc' && (dev.addr === '0x78c5e570796e' || dev.addr === '0x544a165e1f53')) {  // && dev.addr === '0x78c5e570796e'
            discDevNum += 1;
            connectDevice(dev); 
        }
    });

    if (discDevNum !== 0) {
        bShepherd.once('internal', function () {
            bShepherd.nwkScanner.permitJoin(true);
            bShepherd.devmgr._scanState = 'on';
        });
    } else {
        bShepherd.nwkScanner.permitJoin(true);
        bShepherd.devmgr._scanState = 'on';
    }
}

function ccBnpEvtHdlr (msg) {
    var dev;

    try {
        if (msg.type === 'linkEstablished') {
            dev = bShepherd.devmgr.findDev(msg.data.addr);
        } else {
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
                bShepherd.emit('IND', {type: 'LOCAL_SERV_ERR', data: err});
            }).done();
            break;
        default:
            break;
    }
}

/*************************************************************************************************/
/*** Private Function                                                                          ***/
/*************************************************************************************************/
function processLinkEst (msg, dev) {
    var rebuildFlag = false;

    if (!dev) {
        dev = bShepherd.devmgr.newDevice('peripheral', msg.addr, msg.addrType);
        rebuildFlag = true;
    } else if (dev.state === 'disc') {
        rebuildFlag = true;
    }else {
        if (dev.state === 'offline') {
            dev.state = 'online';
            dev.update();
        }
        console.log('Device: ' + dev.addr + ' join the network.');
        bShepherd.emit('IND', {type: 'DEV_INCOMING', data: msg.addr});
    }

    if (rebuildFlag) {
        dev._getServs().then(function () {
            return dev.save();
        }).then(function () {
            dev.state = 'online';
            console.log('Device: ' + dev.addr + ' join the network.');
            bShepherd.emit('IND', {type: 'DEV_INCOMING', data: msg.addr});
        }).fail(function () {
            dev.disConnect();
        }).done();
    }    
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
        if (!dev.sm) { dev.createSecMdl(msg); }
        dev.sm.state = 'encrypted';
        dev.sm.update(msg);
    }
}

function processbBondComplete (msg, dev) {
    if (!dev) { return; }
    dev.sm.bond = 'true';
    dev.sm.status = 'encrypted';
}

function connectDevice (dev) {
    if (bShepherd.connSpinLock === 'off') {
        bShepherd.connSpinLock = 'on';
        dev.connect().fail(function (err) {
            console.log('Device ' + dev.addr + ' connect error.');
            console.log(err);
        }).finally(function () {
            bShepherd.connSpinLock = 'off';
            if (!_.isEmpty(bShepherd.devmgr.discDevices)) {
                process.nextTick(function () {
                    var nextDev = bShepherd.devmgr.discDevices.shift();
                    connectDevice(nextDev);
                });
            } else {
                bShepherd.emit('internal', {type: 'CONNECT_OVER'});
            }
        });
    } else {
        if (!_.find(bShepherd.devmgr.discDevices, {addr: dev.addr})) {
            bShepherd.devmgr.discDevices.push(dev);
        }
    }
}

module.exports = bShepherd;