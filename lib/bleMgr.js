'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

var NwkScanner = require('./management/nwkScanner'),
    Sysmgr = require('./management/sysmgr'),
    Devmgr = require('./management/devmgr'),
    bleutil = require('./util/bleutil'),
    BDEFS = require('./defs/bledefs'),
    GATTDEFS = require('./defs/gattdefs');

function Blemgr (spConfig) {
    this.nwkScanner = new NwkScanner();
    this.sysmgr = new Sysmgr();
    this.devmgr = new Devmgr();
    this.spConfig = spConfig;

    this.bleCentral = null;

    this.app = function () {};
    this.preExec = function () {};
    this.connSpinLock = 'off';
}

util.inherits(Blemgr, EventEmitter);
var blemgr = new Blemgr();

Blemgr.prototype.start = function (spConfig, bleapp) {
    var self = this;

    ccBnp.init(spConfig, 'central').then(function () {
        self.app = bleapp;
    });
};

Blemgr.prototype.callBleCmd = function (subGroup, cmd, argInst, callback) {
    var deferred = Q.defer();

    ccBnp[subGroup][cmd](argInst, callback).then(function (result) {
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Blemgr.prototype.regGattDefs = function (type, regObjs) {
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

            if (type === 'characteristic' && !_.isEmpty(regObjs.params) && !_.isEmpty(regObjs.types)) {
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

Blemgr.prototype.addLocalServ = function (bleServ, callback) {
    var deferred = Q.defer();

     if (this.bleCentral && _.indexOf(this.bleCentral.servs, bleServ) !== -1) {
        deferred.reject(new Error('Local service already exist. You need to delete the old before add a new.'));
    } else {
        this.bleCentral.regServ(bleServ).then(function (result) {
            bleServ._registered = true;
            console.log('>> Local service registered!');
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }        

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Event Listeners                                                                           ***/
/*************************************************************************************************/
ccBnp.on('ready', bleInitDoneHdlr);
ccBnp.on('ind', ccBnpEvtHdlr);
blemgr.nwkScanner.on('ind', nwkScannerEvtHdlr);

/*************************************************************************************************/
/*** Event Handlers                                                                            ***/
/*************************************************************************************************/
function bleInitDoneHdlr (msg) {
    var central,
        connectDevFuncs = [];

    console.log('>> Central has completed initialization');
    central = blemgr.devmgr.newDevice('central', msg.devAddr);
    blemgr.bleCentral = central;
    blemgr.devmgr.bleDevices.push(central);

    blemgr.preExec();
    console.log('>> Loading devices from database.');
    blemgr.devmgr.loadDevs().then(function (devs) {
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
        blemgr.nwkScanner.permitJoin(true);
        blemgr.app();
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

    blemgr.nwkScanner.permitJoin(false);
    _.forEach(devsInfo, function (devInfo) {
        dev = blemgr.devmgr.newDevice('peripheral', devInfo.addr, devInfo.addrType);
        if (dev.state === 'disc') { 
            discDevNum += 1;
            connectDevice(dev); 
        }
    });

    if (discDevNum !== 0) {
        blemgr.once('internal', function () {
            blemgr.nwkScanner.permitJoin(true);
        });
    } else {
        blemgr.nwkScanner.permitJoin(true);
    }
}

function ccBnpEvtHdlr (msg) {
    var dev;

    switch (msg.type) {
        case 'linkEstablished':
            if (msg.data.addr === '0x000000000000') { break; }
            setTimeout(function () { processLinkEst(msg.data); }, 10);
            break;
        case 'linkTerminated':
            processLinkTerm(msg.data);
            break;
        case 'linkParamUpdate':
            processLinkParamUpdate(msg.data);
            break;
        case 'attNoti':
        case 'attInd':
            processAttrInd(msg.type, msg.data);
            break;
        case 'authenComplete':
            processAuthenComplete(msg.data);
            break;
        case 'passkeyNeeded':
            blemgr.emit('ind', {type: 'PASSKEY_NEED', data: msg.data});
            break;
        case 'bondComplete':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            dev.sm.status = 'encrypted';
            break;
        case 'attReq':
            blemgr.bleCentral.processAttMsg(msg.data);
            break;
        default:
            break;
    }
}

/*************************************************************************************************/
/*** Private Function                                                                          ***/
/*************************************************************************************************/
function processLinkEst (msg) {
    var dev = blemgr.devmgr.findDev(msg.addr),
        rebuildFlag = false;

    if (!dev) {
        console.log('no device');
        dev = blemgr.devmgr.newDevice('peripheral', msg.addr, msg.addrType);
        rebuildFlag = true;
    } else if (dev.state === 'disc') {
        console.log('state: disc');
        rebuildFlag = true;
    }else {
        if (dev.state === 'offline') {
            dev.state = 'online';
            dev.update();
        }
        console.log('Device: ' + dev.addr + ' join the network.');
        blemgr.emit('ind', {type: 'DEV_INCOMING', data: msg.addr});
    }

    if (rebuildFlag) {
        dev.getServs().then(function () {
            return dev.save();
        }).then(function () {
            dev.state = 'online';
            console.log('Device: ' + dev.addr + ' join the network.');
            blemgr.emit('ind', {type: 'DEV_INCOMING', data: msg.addr});
        }).fail(function () {
            dev.disConnect();
        }).done();
    }    
}

function processLinkTerm (msg) {
    var dev = blemgr.devmgr.findDev(msg.connHandle);

    if (!dev) { return; }
    dev.state = 'offline';
    dev.connHdl = null;
    console.log('Device: ' + dev.addr + ' leave the network.');
    blemgr.emit('ind', {type: 'DEV_LEAVING', data: msg.addr});
}

function processLinkParamUpdate (msg) {
    var dev = blemgr.devmgr.findDev(msg.connHandle);

    if (!dev) { return; }
    dev.linkParams = {
        interval: msg.interval, 
        latency: msg.connLatency,
        timeout: msg.connTimeout
    };     
}

function processAttrInd (type, msg) {
    var dev = blemgr.devmgr.findDev(msg.connHandle);

    if (!dev) { return; }
    _.forEach(dev.servs, function (serv) {
        _.forEach(serv.chars, function (char) {
            if (char.hdl === msg.handle) {
                char.indUpdate(msg.value);
            }
        });
    });
    if (type === 'attInd') {
        ccBnp.att.handleValueCfm(msg.connHandle);
    }
}

function processAuthenComplete (msg) {
    var dev = blemgr.devmgr.findDev(msg.connHandle);

    if (!dev) { return; }
    if (msg.ltk !== new Buffer(16).fill(0)) {
        if (!dev.sm) { dev.createSecMdl(msg); }
        dev.sm.state = 'encrypted';
        dev.sm.update(msg);
    }
}

function processbBondComplete (msg) {
    var dev = blemgr.devmgr.findDev(msg.connHandle);
    
    if (!dev) { return; }
    dev.sm.bond = 'true';
    dev.sm.status = 'encrypted';
}

function connectDevice (dev) {
    if (blemgr.connSpinLock === 'off') {
        blemgr.connSpinLock = 'on';
        dev.connect().fail(function (err) {
            console.log('Device ' + dev.addr + 'connect error.');
            console.log(err);
        }).finally(function () {
            blemgr.connSpinLock = 'off';
            if (!_.isEmpty(blemgr.devmgr.discDevices)) {
                process.nextTick(function () {
                    var nextDev = blemgr.devmgr.discDevices.shift();
                    connectDevice(nextDev);
                });
            } else {
                blemgr.emit('internal', {type: 'CONNECT_OVER'});
            }
        });
    } else {
        if (!_.find(blemgr.devmgr.discDevices, {addr: dev.addr})) {
            blemgr.devmgr.discDevices.push(dev);
        }
    }
}

module.exports = blemgr;