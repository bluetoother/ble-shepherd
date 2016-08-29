/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Q = require('q');

var Blocker = function (shepherd) {
    var shp = shepherd,
        enabled = false,
        blockerType = null,
        blacklist = [],
        whitelist = [];

    this.enable = function (type) {
        if (!_.isNil(type) && type !== 'black' && type !== 'white') 
            throw new TypeError('type should be black or white in string if given.');

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
        var deferred = Q.defer(),
            periph;

        if (!_.isString(permAddr) || _.startsWith(permAddr, '0x'))
            throw new TypeError('permAddr must be a string and start with 0x');

        if (!enabled)
            deferred.reject(new Error('You should enable blocker first.')); 
        else {
            _.remove(whitelist, function (n) {             // remove from whitelist
                return n === permAddr.toLowerCase();
            });

            if (!this.isBlacklisted(permAddr))              // add to blacklist
                blacklist.push(permAddr.toLowerCase());    

            periph = shp.find(permAddr);

            if (periph) 
                return shp.remove(periph.addr, callback);
            else 
                deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.unblock = function (permAddr, callback) {
        var deferred = Q.defer(),
            err = null;

        if (!enabled) 
            deferred.reject(new Error('You should enable blocker first.'));
        else {
            if (!this.isWhitelisted(permAddr))              // add to whitelist
                whitelist.push(permAddr.toLowerCase());

            _.remove(blacklist, function (n) {             // remove from blacklist
                return n === permAddr.toLowerCase();
            });

            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.isBlacklisted = function (permAddr) {
        if (!_.isString(permAddr) || _.startsWith(permAddr, '0x'))
            throw new TypeError('permAddr must be a string and start with 0x');
        
        return _.includes(blacklist, permAddr.toLowerCase());
    };

    this.isWhitelisted = function (permAddr) {
        if (!_.isString(permAddr) || _.startsWith(permAddr, '0x'))
            throw new TypeError('permAddr must be a string and start with 0x');

        return _.includes(whitelist, permAddr.toLowerCase());
    };
};

module.exports = Blocker;    