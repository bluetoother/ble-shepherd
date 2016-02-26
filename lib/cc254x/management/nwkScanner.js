'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccbnp = require('cc-bnp');

function NwkScanner () {
    this.scanParams = {
        time: 10240,
        interval: 16,
        window: 16
    };
    this.linkParams = {
        interval: 24, 
        latency: 0,
        timeout: 200
    };
}

util.inherits(NwkScanner, EventEmitter);

NwkScanner.prototype.setScanParams = function (setting) { 
    var self = this,
        deferred = Q.defer(),
        scanParams = self.scanParams;

    if (_.isUndefined(setting.time)) { setting.time = scanParams.time; }
    if (_.isUndefined(setting.interval)) { setting.interval = scanParams.interval; }
    if (_.isUndefined(setting.window)) { setting.window = scanParams.window; }

    ccbnp.gap.setParam(2, setting.time).then(function (result) {
        scanParams.time = setting.time;
        return ccbnp.gap.setParam(16, setting.interval);
    }).then(function (result) {
        scanParams.interval = setting.interval;
        return ccbnp.gap.setParam(17, setting.window);
    }).then(function (result) {
        scanParams.window = setting.window;
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done(); 

    return deferred.promise;
};

NwkScanner.prototype.getScanParams = function () {
    var self = this,
        deferred = Q.defer();

    ccbnp.gap.getParam(2).then(function (result) {
        self.scanParams.time = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccbnp.gap.getParam(16);
    }).then(function (result) {
        self.scanParams.interval = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccbnp.gap.getParam(17);
    }).then(function (result) {
        self.scanParams.window = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve(self.scanParams);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise;
};

NwkScanner.prototype.setLinkParams = function (setting) { 
    var self = this,
        deferred = Q.defer(),
        linkParams = self.linkParams;

    if (_.isUndefined(setting.interval)) { setting.interval = linkParams.interval; }
    if (_.isUndefined(setting.latency)) { setting.latency = linkParams.latency; }
    if (_.isUndefined(setting.timeout)) { setting.timeout = linkParams.timeout; }

    ccbnp.gap.setParam(21, setting.interval).then(function () {
        linkParams.interval = setting.interval;
        return ccbnp.gap.setParam(22, setting.interval);
    }).then(function () {
        return ccbnp.gap.setParam(26, setting.latency);
    }).then(function () {
        linkParams.latency = setting.latency;
        return ccbnp.gap.setParam(25, setting.timeout);
    }).then(function () {
        linkParams.timeout = setting.timeout;
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

NwkScanner.prototype.getLinkParams = function () {
    var self = this,
        deferred = Q.defer();

    ccbnp.gap.getParam(21).then(function (result) {
        self.linkParams.interval = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccbnp.gap.getParam(26);
    }).then(function (result) {
        self.linkParams.latency = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccbnp.gap.getParam(25);
    }).then(function (result) {
        self.linkParams.timeout = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

NwkScanner.prototype.scan = function () {
    var deferred = Q.defer(),
        self = this,
        devs;

    ccbnp.gap.deviceDiscReq(3, 1, 0).then(function (result) {
        devs = _.filter(_.last(result).GapDeviceDiscovery, function (val, key) {
            if (_.startsWith(key, 'dev')) { return val; }
        });
        self.emit('NS:IND', devs);
        deferred.resolve(devs);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

NwkScanner.prototype.cancelScan = function () {
    return ccbnp.gap.deviceDiscCancel();
};

module.exports = new NwkScanner();