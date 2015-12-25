'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs');

var sysmgr = {};

sysmgr.hardReset = function (callback) {
    var deferred = Q.defer();

    ccBnp.hci.resetSystem(0).then(function (result) {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

sysmgr.softReset = function (callback) {
    var deferred = Q.defer();
    
    ccBnp.hci.resetSystem(1).then(function (result) {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = sysmgr;