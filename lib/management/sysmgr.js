'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs');

var sysmgr = {};

sysmgr.init = function (callback) {
    var deferred = Q.defer(),
        resultObj = {};

    ccBnp.gap.deviceInit(8, 5, new Buffer(16).fill(0), new Buffer(16).fill(0), 1).then(function (result) {
        resultObj.addr = result[1].GapDeviceInitDone.devAddr;
        resultObj.irk = result[1].GapDeviceInitDone.IRK;
        resultObj.csrk = result[1].GapDeviceInitDone.CSRK;
        deferred.resolve(resultObj);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

sysmgr.hardReset = function (callback) {
    var deferred = Q.defer();

    ccBnp.hci.resetSystem(0).then(function (result) {
        deferred.resolve({status: result[0].HciResetSystem.status});
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

sysmgr.softReset = function (callback) {
    var deferred = Q.defer();
    
    ccBnp.hci.resetSystem(1).then(function (result) {
        deferred.resolve({status: result[0].HciResetSystem.status});
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = sysmgr;