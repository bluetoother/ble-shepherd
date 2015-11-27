'use strict';

var Q = require('q'),
    _ = require('lodash'),
    ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs');

var sysmgr = {};

sysmgr.init = function (callback) {
    var deferred = Q.defer(),
        resultObj = {};

    ccBnp.execCmd('Gap', 'DeviceInit', {profileRole: 8, maxScanResponses: 5, IRK: new Buffer(16), CSRK: new Buffer(16), signCounter: 1}).then(function (result) {
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

    ccBnp.execCmd('Hci', 'ResetSystem', {mode: 0}).then(function (result) {
        deferred.resolve({status: result[0].HciResetSystem.status});
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

sysmgr.softReset = function (callback) {
    var deferred = Q.defer();

    ccBnp.execCmd('Hci', 'ResetSystem', {mode: 1}).then(function (result) {
        deferred.resolve({status: result[0].HciResetSystem.status});
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = sysmgr;