'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var Char = require('./characteristic'),
	BDEFS = require('../defs/bledefs');

function Service (servInfo) {
	this.ownerDev = null;
	this.uuid = servInfo.uuid;
	this.name = BDEFS.Gatt.ServUuid.get(this.uuid).key;
	this.startHdl = servInfo.startHdl;
	this.endHdl = servInfo.endHdl;
	this.chars = [];
}

Service.prototype.getChars = function (callback) {
	var self = this,
		deferred = Q.defer(),
		charObj,
		charsInfo = [],
		characteristic;

	ccBnp.gatt.discAllChars(this.ownerDev.connHdl, this.startHdl, this.endHdl).then(function (result) {
		_.forEach(result[1], function (evtObj) {
            if (evtObj.status === 0) { 
            	charObj = evtObj.data; 
                for (var i = 0; i < (_.keys(charObj).length / 2); i += 1) {
                    charsInfo.push({
                        prop: charObj['attrVal' + i].readUInt8(),
                        hdl: charObj['attrVal' + i].readUInt16LE(1),
                        uuid: charObj['attrVal' + i].readUInt16LE(3)
                    });
                }
            }
        });

		_.forEach(charsInfo, function (charInfo) {
			characteristic = new Char(charInfo);
			characteristic.ownerServ = self;
			self.chars.push(characteristic);
		});
		deferred.resolve();
	}).fail(function (err) {
		deferred.reject(err);
	});

	return deferred.promise.nodeify(callback);
};

Service.prototype.save = function () {

};

Service.prototype.update = function () {

};

Service.prototype.remove = function () {

};

Service.prototype.readCharsInfo = function () {

};

module.exports = Service;