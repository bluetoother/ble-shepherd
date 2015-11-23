'use strict';

var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

function NwkScanner () {
    if (_.isObject(NwkScanner.instance)) { return NwkScanner.instance; }
    NwkScanner.instance = this;

    this.scanState = 'off';
    this.permitState = 'off';
    this.scanParams = {
        scanTime: null,
        scanInterval: null,
        scanWindow: null
    };
    this.linkParams = {
        interval: null, 
        latency: null,
        timeout: null
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

    if (this.scanState === 'off') {
        deferred.resolve();
    } else {
        ccBnp.gap.deviceDiscCancel().then(function (result) {
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();  
    }
    
    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.contScan = function (callback) {
    var self = this,
        deferred = Q.defer(),
        flag = true;

    this.removeAllListeners('stopScan');
    this.once('stopScan', function () {
        flag = false;
    });

    this.scanState = 'on';
    this.scan().then(function (result) {
        self.emit('ind', {type: 'discDev', data: result});
        deferred.resolve(result);
    }).fail(function (err) {
        deferred.reject(err);
    }).finally(function () {
        self.scanState = 'off';		
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

NwkScanner.prototype.setLinkParams = function (interval, connLatency, connTimeout, callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.setParam(21, interval).then(function () {
        self.linkParams.interval = interval;
        return ccBnp.gap.setParam(22, interval);
    }).then(function () {
        return ccBnp.gap.setParam(26, connLatency);
    }).then(function () {
        self.linkParams.latency = connLatency;
        return ccBnp.gap.setParam(25, connTimeout);
    }).then(function () {
        self.linkParams.timeout = connTimeout;
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
};

NwkScanner.prototype.getLinkParams = function (callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.getParam(21).then(function (result) {
        self.linkParams.interval = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(26);
    }).then(function (result) {
        self.linkParams.latency = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(25);
    }).then(function (result) {
        self.linkParams.timeout = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
};


module.exports = NwkScanner;