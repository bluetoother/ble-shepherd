/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Q = require('q'),
    proving = require('proving'),
    butil = require('./bleutil');

var Blocker = function (shepherd) {
    var self = this,
        shp = shepherd,
        enabled = false,
        blockerType = null,
        blacklist = [],
        whitelist = [];

    this.enable = function (type) {
        if (!_.isNil(type) && type !== 'black' && type !== 'white') 
            throw new TypeError('type should be black or white in string if given.');

        blockerType = type ? type: 'black';
        enabled = true;

        if (blockerType === 'white') {
            setTimeout(function () {
                _.forEach(shp._periphBox.exportAllObjs(), function (periph) {
                    if (!self.isWhitelisted(periph.addr))
                        shp.remove(periph.addr);
                });
            }, 500);
        }

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

    this.block = function (addr, callback) {
        var deferred = Q.defer(),
            periph;

        addr = butil.checkAddr(addr, 'addr must be a string');

        if (!enabled)
            deferred.reject(new Error('You should enable blocker first.')); 
        else {
            _.remove(whitelist, function (n) {              // remove from whitelist
                return n === addr;
            });

            if (!this.isBlacklisted(addr))              // add to blacklist
                blacklist.push(addr);    

            periph = shp.find(addr);

            if (periph) 
                return shp.remove(periph.addr, callback);
            else 
                deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.unblock = function (addr, callback) {
        var deferred = Q.defer(),
            err = null;

        addr = butil.checkAddr(addr, 'addr must be a string');

        if (!enabled) 
            deferred.reject(new Error('You should enable blocker first.'));
        else {
            if (!this.isWhitelisted(addr))              // add to whitelist
                whitelist.push(addr);

            _.remove(blacklist, function (n) {              // remove from blacklist
                return n === addr;
            });

            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.isBlacklisted = function (addr) {
        addr = butil.checkAddr(addr, 'addr must be a string');
        
        return _.includes(blacklist, addr);
    };

    this.isWhitelisted = function (addr) {
        addr = butil.checkAddr(addr, 'addr must be a string');

        return _.includes(whitelist, addr);
    };
};

module.exports = Blocker;    