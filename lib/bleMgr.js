'use strict';

var Q = require('q'),
	_ = require('lodash'),
	util = require('util'),
    EventEmitter = require('events').EventEmitter,
	ccBnp = require('ccbnp');

var NwkScanner = require('./service/nwkScanner'),
	Sysmgr = require('./service/sysmgr'),
	Secmgr = require('./service/secmgr'),
	Devmgr = require('./service/devmgr');

function Blemgr () {
	this.nwkScanner = new NwkScanner();
	this.sysmgr = new Sysmgr();
	this.secmgr = new Secmgr();
	this.devmgr = new Devmgr();
}

util.inherits(Blemgr, EventEmitter);
var blemgr = new Blemgr();

Blemgr.prototype.start = function () {

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
	var central;

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
            break;
        case 'attInd':
            break;
        case 'authenticationComplete':
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