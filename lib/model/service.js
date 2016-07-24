/*jslint node: true */
'use strict';

var _ = require('busyman');


var GATTDEFS = require('../defs/gattdefs'),
    Characteristic = require('./characteristic');

function Service (servInfo, perhpheral) {
    var self = this;

	this._original = servInfo.original ? servInfo.original : null;
    this._peripheral = perhpheral;

	this.uuid = servInfo.uuid;
    this.startHdl = servInfo.startHdl;
    this.endHdl = servInfo.endHdl;
    this.name = null;
    this.chars = {};

    _.forEach(servInfo.chars, function (charInfo) {
        var char = new Characteristic(charInfo, self);

        self.chars[char.hdl] = char;
    });

    if (GATTDEFS.ServUuid.get(_.parseInt(this.uuid))) { 
        this.name = GATTDEFS.ServUuid.get(_.parseInt(this.uuid)).key; 
    } else if (GATTDEFS.ServUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10)))) {
         this.name = GATTDEFS.ServUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10))).key; 
    }
}

Service.prototype.dump = function () {
    var chars = {};

    _.forEach(this.chars, function (char) {
        chars[char.hdl] = char.dump();
    });
    return {
        uuid: this.uuid,
        startHdl: this.startHdl,
        endHdl: this.endHdl,
        chars: chars
    };
};

module.exports = Service;