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

function Blemgr () {
	this.nwkScanner = new NwkScanner();
	this.sysmgr = new Sysmgr();
	this.devmgr = new Devmgr();

    this.bleCentral = null;

	this.app = function () {};

    this.nwkScanner.on('ind', nwkScannerEvtHdlr);
}

util.inherits(Blemgr, EventEmitter);
var blemgr = new Blemgr();

Blemgr.prototype.start = function (bleapp) {
    var self = this,
        config = {
            path: '/dev/ttyACM0',
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        };

    ccBnp.init(config, 'central').then(function () {
        self.app = bleapp;
    });
};

/*************************************************************************************************/
/*** Event Listeners                                                                           ***/
/*************************************************************************************************/
ccBnp.on('ready', bleInitDoneHdlr);
ccBnp.on('ind', ccBnpEvtHdlr);
/*************************************************************************************************/
/*** Event Handlers                                                                            ***/
/*************************************************************************************************/
function BleCentral (addr) {
    this.role = 'central';
    this.addr = addr;
}  //TODO
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
            dev.state = 'offline';
            connectDevFuncs.push(function () {
                var deferred = Q.defer();
                dev.connect().then(function () {
                    deferred.resolve();
                }).fail(function () {
                    //TODO, remove or remain in devmgr
                    deferred.resolve();
                }).done();
                return deferred.promise;
            });
        });
        
        return bleutil.seqResolveQFuncs(connectDevFuncs);
    }).then(function () {
        blemgr.nwkScanner.permitJoin(true);
        console.log('>> Starting bleApp.');
        blemgr.app();
    }).fail(function (err) {
        console.log('Problem occurs when starting zApp:');
        console.log(err);
    }).done();
}

function nwkScannerEvtHdlr (msg) {
    var dev,
        devsInfo = msg.data,
        connectDevFuncs = [];

    _.forEach(devsInfo, function (devInfo) {
        dev = blemgr.devmgr.newDevice('peripheral', devInfo.addr, devInfo.addrType);
        if (dev.state === 'disc') { connectDevFuncs.push(dev.connect.bind(dev)); }
    });

    bleutil.seqResolveQFuncs(connectDevFuncs).then(function (result) {
        // console.log(result);
    }).fail(function (err) {
        // console.log(err);
    });
}

function ccBnpEvtHdlr (msg) {
	var dev;

    switch (msg.type) {
        case 'linkEstablished':
            dev = blemgr.devmgr.findDev(msg.data.addr);
            setTimeout(function () {
                console.log(dev.state);
                console.log('Device: ' + dev.addr + ' join the network.');
                if (dev.state === 'online') { blemgr.emit('ind', {type: 'DEV_INCOMING', data: msg.data.addr}); }
                if (dev.state === 'offline') {}
            }, 10);
                //TODO
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
            break;
        case 'authenComplete':
        	dev = blemgr.devmgr.findDev(msg.data.connHandle);
        	if (dev.sm) {
        		dev.sm.update(msg.data);
        	} else {
        		dev.createSecMdl(msg.data);
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

module.exports = blemgr;