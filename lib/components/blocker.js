/* jshint node: true */
'use strict';

var _ = require('busyman');

var Blocker = function (shepherd) {
    var shp = shepherd,
        enabled = false,
        blockerType = null,
        blacklist = [],
        whitelist = [];

    this.enable = function (type) {
        if (!_.isNil(type) && type !== 'black' && type !== 'white') 
            throw new Error('type should be black or white in string if given.');

        blockerType = type ? type: 'black';
        enabled = true;

        return this;
    };

    this.disable = function () {
        enabled = false;

        return this;
    };

    this.isEnabled = function () {
        return enabled;
    };

    this.getType = function () {
        return blockerType;
    };

    this.block = function (permAddr, callback) {
        var periph;

        if (!callback) callback = function () {};

        if (!enabled)
            callback(new Error('You should enable blocker first.')); 
        else {
            _.remove(whitelist, function (n) {             // remove from whitelist
                return n === permAddr.toLowerCase();
            });

            if (!this.isBlacklisted(permAddr))              // add to blacklist
                blacklist.push(permAddr.toLowerCase());    

            periph = shp.find(permAddr);

            if (periph) 
                shp.remove(periph.addr, callback);
            else 
                callback(null);
        }
    };

    this.unblock = function (permAddr, callback) {
        var err = null;

        if (!callback) callback = function () {};

        if (!enabled) 
            err = new Error('You should enable blocker first.'); 
        else {
            if (!this.isWhitelisted(permAddr))              // add to whitelist
                whitelist.push(permAddr.toLowerCase());

            _.remove(blacklist, function (n) {             // remove from blacklist
                return n === permAddr.toLowerCase();
            });
        }

        process.nextTick(function () {
            callback(err);
        });
    };

    this.isBlacklisted = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');
        return _.includes(blacklist, permAddr.toLowerCase());
    };

    this.isWhitelisted = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');

        return _.includes(whitelist, permAddr.toLowerCase());
    };
};

module.exports = Blocker;    