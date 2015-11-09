'use strict';

var Q = require('q'),
	_ = require('lodash'),
	util = require('util'),
    EventEmitter = require('events').EventEmitter,
	ccBnp = require('ccbnp');

var NwkScanner = require('./service/nwkScanner'),
	Sysmgr = require('./service/sysmgr'),
	Devmgr = require('./service/devmgr'),
	BDEFS = require('./defs/bledefs');

function Blemgr () {
	this.nwkScanner = new NwkScanner();
	this.sysmgr = new Sysmgr();
	this.devmgr = new Devmgr();

	this.app = function () {};
}

util.inherits(Blemgr, EventEmitter);
var blemgr = new Blemgr();

Blemgr.prototype.start = function (bleapp) {
	var self = this,
		config = {
			path: '/dev/ttyACM2',
			options: {
				baudRate: 115200,
				rtscts: true,
				flowControl: true
			}
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
function bleInitDoneHdlr (msg) {
	var central,
		devs;

	// for test
	// central = blemgr.devmgr.newDevice('central', msg.devAddr, 0);
	// console.log(blemgr.devmgr.discDevs);

	// blemgr.nwkScanner.scan().then(function (devsInfo) {
	// 	console.log(devsInfo);
	// 	devs = blemgr.devmgr.newDiscDevs(devsInfo);
	// 	console.log(devs[0]);
	// 	devs[0].connect().then(function (result) {
	// 		console.log('connect over');
	// 		console.log(result);
	// 	});
	// });

	blemgr.devmgr.loadDevs().then(function (devs) {
		console.log(devs);
		_.forEach(devs, function (dev) {
			dev = blemgr.devmgr.newDevice('peripheral', dev.addr, dev.addrType);
			dev.connect().then(function () {
				return dev.servs['0xaa00'].chars['0xaa01'].read();
			}).then(function (result) {
				console.log(dev.servs['0xaa00'].chars['0xaa01']);
			}).fail(function (err) {
				console.log(err);
			}).done();
		});
	});

}

function ccBnpEvtHdlr (msg) {
	var dev;

    switch (msg.type) {
        case 'linkEstablished':
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
            break;
        case 'attInd':
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