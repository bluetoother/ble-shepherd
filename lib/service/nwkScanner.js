'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

function NwkScanner () {
    if (_.isObject(NwkScanner.instance)) { return NwkScanner.instance; }
    NwkScanner.instance = this;

    this.permitState = 'off';
    this.scanParams = {
        scanTime: 0,
        scanInterval: 0,
        scanWindow: 0
    };
}

util.inherits(NwkScanner, EventEmitter);

NwkScanner.prototype.permitJoin = function (mode, callback) {
    var deferred = Q.defer();

    if (mode && this.permitState === 'off') {
        this.permitState = 'on';
        this.contScan();
        deferred.resolve('success');
    } else if (!mode && this.permitState === 'on') {
        this.permitState = 'off';
        this.emit('stopScan');
        deferred.resolve('success');
    } else {
        if (mode) {
            deferred.reject('Scanning has already start.');
        } else {
            deferred.reject('Scanning has already stop.');
        }
    }

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.scan = function (callback) {
    var deferred = Q.defer(),
        devs;

    ccBnp.gap.deviceDiscReq(3, 1, 0).then(function (result) {
        devs = _.filter(_.last(result).GapDeviceDiscovery, function (val, key) {
            if (_.startsWith(key, 'dev')) { return val; }
        });
        deferred.resolve(devs);
    }).fail(function (err) {
        deferred.reject('err: ' + err);
    }).done();

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.cancelScan = function (callback) {
    var deferred = Q.defer();

    ccBnp.gap.deviceDiscCancel().then(function (result) {
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.contScan = function (callback) {
    var self = this,
        deferred = Q.defer(),
        flag = true;

    self.removeAllListeners('stopScan');
    this.once('stopScan', function () {
        flag = false;
    });

    this.scan().then(function (result) {
        self.emit('ind', {type: 'discDev', data: result});
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).finally(function () {		
        if (flag) {
            process.nextTick(function () {
                self.contScan();
            });
        }
    }).done();

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.setScanParam = function (scanTime, scanInt, scanWin, callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.setParam(2, (scanTime || 10240)).then(function (result) {
        self.scanParams.scanTime = (scanTime || 10240);
        return ccBnp.gap.setParam(16, (scanInt || 16));
    }).then(function (result) {
        self.scanParams.scanInterval = (scanInt || 16);
        return ccBnp.gap.setParam(17, (scanWin || 16));
    }).then(function (result) {
        self.scanParams.scanWindow = (scanWin || 16);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.getScanParam = function (callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.getParam(2).then(function (result) {
        self.scanParams.scanTime = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(16);
    }).then(function (result) {
        self.scanParams.scanInterval = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(17);
    }).then(function (result) {
        self.scanParams.scanWindow = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise.nodeify(callback);
};


module.exports = NwkScanner;