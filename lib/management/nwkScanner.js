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
        time: 10240,
        interval: 16,
        window: 16
    };
    this.linkParams = {
        interval: 80, 
        latency: 0,
        timeout: 2000
    };
}

util.inherits(NwkScanner, EventEmitter);
NwkScanner.prototype.setLinkParams = function (setting, callback) { //interval, latency, timeout  
    var self = this,
        deferred = Q.defer(),
        linkParams = self.linkParams;

    if (!setting) { setting = {}; }
    if (_.isFunction(arguments[0])) {
        callback = setting;
        setting = {};
    }

    if (!_.isPlainObject(setting)) {
        deferred.reject(new TypeError('setting must be an object and not be an array.'));
    } else {
        if (_.isUndefined(setting.interval)) { setting.interval = linkParams.interval; }
        if (_.isUndefined(setting.latency)) { setting.latency = linkParams.latency; }
        if (_.isUndefined(setting.timeout)) { setting.timeout = linkParams.timeout; }
        
        ccBnp.gap.setParam(21, setting.interval).then(function () {
            linkParams.interval = setting.interval;
            return ccBnp.gap.setParam(22, setting.interval);
        }).then(function () {
            return ccBnp.gap.setParam(26, setting.latency);
        }).then(function () {
            linkParams.latency = setting.latency;
            return ccBnp.gap.setParam(25, setting.timeout);
        }).then(function () {
            linkParams.timeout = setting.timeout;
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};
NwkScanner.prototype.setScanParams = function (setting, callback) { //time, interval, window
    var self = this,
        deferred = Q.defer(),
        scanParams = self.scanParams;

    if (!setting) { setting = {}; }
    if (_.isFunction(arguments[0])) {
        callback = setting;
        setting = {};
    }

    if (!_.isPlainObject(setting)) {
        deferred.reject(new TypeError('setting must be an object and not be an array.'));
    } else {
        if (_.isUndefined(setting.time)) { setting.time = scanParams.time; }
        if (_.isUndefined(setting.interval)) { setting.interval = scanParams.interval; }
        if (_.isUndefined(setting.window)) { setting.window = scanParams.window; }

        ccBnp.gap.setParam(2, setting.time).then(function (result) {
            scanParams.time = setting.time;
            return ccBnp.gap.setParam(16, setting.interval);
        }).then(function (result) {
            scanParams.interval = setting.interval;
            return ccBnp.gap.setParam(17, setting.window);
        }).then(function (result) {
            scanParams.window = setting.window;
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done(); 
    }

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.getScanParams = function (callback) {
    var self = this,
        deferred = Q.defer();

    ccBnp.gap.getParam(2).then(function (result) {
        self.scanParams.time = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(16);
    }).then(function (result) {
        self.scanParams.interval = result[0].GapCmdStatus.payload.readUInt16LE(0);
        return ccBnp.gap.getParam(17);
    }).then(function (result) {
        self.scanParams.window = result[0].GapCmdStatus.payload.readUInt16LE(0);
        deferred.resolve(self.scanParams);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.setLinkParams = function (setting, callback) { //interval, latency, timeout  
    var self = this,
        deferred = Q.defer(),
        linkParams = self.linkParams;

    if (!setting) { setting = {}; }
    if (_.isFunction(arguments[0])) {
        callback = setting;
        setting = {};
    }

    if (!_.isPlainObject(setting)) {
        deferred.reject(new TypeError('setting must be an object and not be an array.'));
    } else {
        if (_.isUndefined(setting.interval)) { setting.interval = linkParams.interval; }
        if (_.isUndefined(setting.latency)) { setting.latency = linkParams.latency; }
        if (_.isUndefined(setting.timeout)) { setting.timeout = linkParams.timeout; }

        ccBnp.gap.setParam(21, setting.interval).then(function () {
            linkParams.interval = setting.interval;
            return ccBnp.gap.setParam(22, setting.interval);
        }).then(function () {
            return ccBnp.gap.setParam(26, setting.latency);
        }).then(function () {
            linkParams.latency = setting.latency;
            return ccBnp.gap.setParam(25, setting.timeout);
        }).then(function () {
            linkParams.timeout = setting.timeout;
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
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
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.cancelScan = function (callback) {
    var deferred = Q.defer();

    ccBnp.gap.deviceDiscCancel().then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();  
    
    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype.permitJoin = function (mode, callback) {
    var deferred = Q.defer();
    
    if (!_.isBoolean(mode)) {
        deferred.reject(new TypeError('mode must be a boolean'));
    } else {
        if (mode && this.permitState === 'off') {
            this.permitState = 'on';
            this._contScan();
            deferred.resolve();
        } else if (!mode && this.permitState === 'on') {
            this.permitState = 'off';
            this.emit('stopScan');
            deferred.resolve();
        } else {
            if (mode) {
                deferred.reject(new Error('Scanning has already start.'));
            } else {
                deferred.reject(new Error('Scanning has already stop.'));
            }
        }
        this.emit('NS:IND', {type: 'STATE_CHANGE', data: this.permitState});
    }

    return deferred.promise.nodeify(callback);
};

NwkScanner.prototype._contScan = function () {
    var self = this,
        flag = true;

    this.removeAllListeners('stopScan');
    this.once('stopScan', function () {
        flag = false;
    });

    this.scan().then(function (result) {
        self.emit('NS:IND', {type: 'DISC_DEV', data: result});
        return result;
    }, function (err) {
        return self.cancelScan();
    }).finally(function () {
        if (flag) {
            process.nextTick(function () {
                self._contScan();
            });
        }
    }).done();
};

module.exports = NwkScanner;