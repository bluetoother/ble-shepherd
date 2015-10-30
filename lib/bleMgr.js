'use strict';

var Q = require('q'),
	_ = require('lodash'),
	bleHci = require('');

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

Blemgr.prototype.start = function () {

};