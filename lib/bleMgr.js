'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

var NwkScanner = require('./service/nwkScanner'),
    Sysmgr = require('./service/sysmgr'),
    Devmgr = require('./service/devmgr'),
    bleutil = require('./util/bleutil'),
    BDEFS = require('./defs/bledefs');

function Blemgr (spConfig) {
    this.nwkScanner = new NwkScanner();
    this.sysmgr = new Sysmgr();
    this.devmgr = new Devmgr();
    this.spConfig = spConfig;

    this.bleCentral = null;

    this.app = function () {};
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
    central = {role: 'central', addr: msg.devAddr};
    blemgr.devmgr.bleDevices.push(central);

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
console.log(msg);
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
            dev = blemgr.devmgr.findDev(msg.data.addr);
            setTimeout(function () {
                console.log('Device: ' + dev.addr + ' join the network.');
                if (dev.state === 'online') { blemgr.emit('ind', {type: 'DEV_INCOMING', data: msg.data.addr}); }
                //TODO, state not equal to online means user not call command 
            }, 10);
            break;
        case 'linkTerminated':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            dev.state = 'offline';
            break;
        case 'linkParamUpdate':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            dev.linkParams = {
                interval: msg.data.interval, 
                latency: msg.data.connLatency,
                timeout: msg.data.connTimeout
            };
            break;
        case 'attNoti':
        case 'attInd':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            _.forEach(dev.servs, function (serv) {
                _.forEach(serv.chars, function (char) {
                    if (char.hdl === msg.data.handle) {
                        char.indUpdate(msg.data.value);
                    }
                });
            });
            if (msg.type === 'attInd') {
                ccBnp.att.handleValueCfm(msg.data.connHandle);
            }
            break;
        case 'authenComplete':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            if (msg.data.ltk !== new Buffer(16).fill(0)) {
                if (!dev.sm) { dev.createSecMdl(msg.data); }
                dev.sm.state = 'encrypted';
                dev.sm.update(msg.data);
            }
            break;
        case 'passkeyNeeded':
            blemgr.emit('ind');
            // dev = blemgr.devmgr.findDev(msg.data.connHandle);
            // dev.passPasskey();
            break;
        case 'bondComplete':
            dev = blemgr.devmgr.findDev(msg.data.connHandle);
            dev.sm.status = 'encrypted';
        default:
            break;
    }
}

function connectDevice (dev) {
    if (blemgr.connSpinLock === 'off') {
        blemgr.connSpinLock = 'on';
        dev.connect().then(function () {
            
        }).fail(function (err) {
            //TODO, reconnect?
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