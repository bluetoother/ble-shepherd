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
			path: '/dev/ttyACM0',
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
		dev;

	// for test
	// central = blemgr.devmgr.newDevice('central', result.devAddr, 0);
	// console.log(blemgr.devmgr.discDevs);
	blemgr.nwkScanner.scan().then(function (devs) {
		console.log(devs);
		_.forEach(devs, function (dev) {
			dev = blemgr.devmgr.newDevice('peripheral', dev.addr, dev.addrType);
			dev.connect();
		});
	});
}

function ccBnpEvtHdlr (msg) {
	var dev;

    switch (msg.type) {
        case 'linkEstablished':
            break;
        case 'linkTerminated':
            break;
        case 'linkParamUpdate':
            break;
        case 'attNoti':
        	console.log(msg.data);
            break;
        case 'attInd':
            break;
        case 'authenComplete':
        	dev = blemgr.devmgr.findDev(msg.data.connHdl);
        	if (dev.sm) {
        		dev.sm.update(msg.data);
        	} else {
        		dev.createSecMdl(msg.data);
        	}
        	break;
        case 'passkeyNeeded':
        	blemgr.emit('ind');
        	// dev = blemgr.devmgr.findDev(msg.data.connHdl);
        	// dev.passPasskey();
        	break;
        case 'bondComplete':
        	dev = blemgr.devmgr.findDev(msg.data.connHdl);
        	dev.sm.status = 'encrypted';
        default:
            break;
    }
}

module.exports = blemgr;