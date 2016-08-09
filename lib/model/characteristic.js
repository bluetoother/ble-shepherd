/*jslint node: true */
'use strict';

var Q = require('q'),
    _ = require('busyman');


var GATTDEFS = require('../defs/gattdefs'),
    butil = require('../components/bleutil');

function Characteristic (charInfo, service) {
    var self = this;

    this._original = charInfo.original ? charInfo.original : null;
    
    this._service = service;
    this._controller = this._service._peripheral._controller;

    this.uuid = charInfo.uuid;
    this.handle = charInfo.handle;
    this.prop = charInfo.prop;
    this.desc = charInfo.desc ? charInfo.desc : null;
    this.name = null;
    this.value = charInfo.value ? charInfo.value : null;

    this.processInd = function () {};

    if (GATTDEFS.CharUuid.get(_.parseInt(this.uuid)))  
        this.name = GATTDEFS.CharUuid.get(_.parseInt(this.uuid)).key;
    else if (GATTDEFS.CharUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10)))) 
         this.name = GATTDEFS.CharUuid.get(_.parseInt('0x' + this.uuid.slice(6, 10))).key; 
}

Characteristic.prototype.read = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.value,
        charInfo = {
            periph: this._service._peripheral,
            type: 'value',
            sid: {
                uuid: this._service.uuid,
                handle: this._service.handle
            },
            cid: {
                uuid: this.uuid,
                handle: this.handle
            },
            value: null,
            diff: null
        };

    if (!_.includes(this.prop, 'read'))
        deferred.reject(new Error('Characteristic value not allowed to read.'));
    else 
        this._controller.read(this).done(function (result) {
            self.value = result;
            if (!_.isEqual(oldVal, result)) {
                if (_.isPlainObject(oldVal))
                    charInfo.diff = butil.objectDiff(oldVal, result);
                else if (_.isBuffer(oldVal) || _.isNull(oldVal))
                    charInfo.diff = result;

                charInfo.value = result;
                self._controller.emit('charChanged', charInfo);
            }
            deferred.resolve(self.value);
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.readDesc = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldDesc = this.desc,
        charInfo = {
            periph: this._service._peripheral,
            type: 'desc',
            sid: {
                uuid: this._service.uuid,
                handle: this._service.handle
            },
            cid: {
                uuid: this.uuid,
                handle: this.handle
            },
            value: null
        };

    this._controller.readDesc(this).done(function (result) {
        self.desc = result;
        if (!_.isEqual(oldDesc, result)) {
            charInfo.value = result;
            self._controller.emit('charChanged', charInfo);
        }
        deferred.resolve(self.desc);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.write = function (value, callback) {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.value,
        charInfo = {
            periph: this._service._peripheral,
            type: 'value',
            sid: {
                uuid: this._service.uuid,
                handle: this._service.handle
            },
            cid: {
                uuid: this.uuid,
                handle: this.handle
            },
            value: null,
            diff: null
        };
        
    if (!_.includes(this.prop, 'write') && !_.includes(this.prop, 'writeWithoutResponse')) 
        deferred.reject(new Error('Characteristic value not allowed to write.'));
    else
        this._controller.write(this, value).done(function () {
            self.value = value;
            if (!_.isEqual(oldVal, value)) {
                if (_.isPlainObject(oldVal))
                    charInfo.diff = butil.objectDiff(oldVal, value);
                else if (_.isBuffer(oldVal) || _.isNull(oldVal))
                    charInfo.diff = value;

                charInfo.value = value;
                self._controller.emit('charChanged', charInfo);
            }
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.notify = function (config, callback) {
    var self = this,
        deferred = Q.defer();

    if (!_.includes(this.prop, 'notify') && !_.includes(this.prop, 'indicate')) 
        deferred.reject(new Error('Characteristic not allowed to notify or indication'));
    else
        this._controller.notify(this, config).done(function (result) {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.dump = function () {
    return {
        uuid: this.uuid,
        handle: this.handle,
        prop: this.prop,
        desc: this.desc || null,
        value: this.value || null
    };
};

module.exports = Characteristic;