/* jshint node: true */
'use strict';

var noble = require('noble'),
    _ = require('busyman'),
    Q = require('q'),
    blePacket = require('ble-packet');

var nobleDrivers = {};

nobleDrivers.init = function () {
    var deferred = Q.defer(),
        stateChangeHdlr;

    stateChangeHdlr = function (state) {
        if (state === 'poweredOn') {
            noble.removeListener('stateChange', stateChangeHdlr);
            deferred.resolve('0x' + noble.address.replace(/[:]/g, ''));
        }
    };

    noble.on('stateChange', stateChangeHdlr);
    noble.init();

    return deferred.promise;
};

nobleDrivers.close = function () {
    var deferred = Q.defer();

    noble.close();
    deferred.resolve();

    return deferred.promise;
};

nobleDrivers.scan = function () {
    var deferred = Q.defer();

    nobleDrivers.cancelScan().done(function () {
        noble.startScanning();
        deferred.resolve();
    }, function () {
        noble.startScanning();
        deferred.resolve();
    });
        
    return deferred.promise;
};

nobleDrivers.cancelScan = function () {
    return Q.ninvoke(noble, 'stopScanning');
};

nobleDrivers.onDiscover = function (id, address, addressType, connectable, advertisement, rssi) {
    noble.onDiscover(id, address, addressType, connectable, advertisement, rssi);
};

nobleDrivers.setScanParams = function (setting) {
    var interval = setting.interval || 16,
        windows = setting.window || 16;

    return Q.ninvoke(noble, 'setScanParameters', interval, windows);
};

nobleDrivers.setLinkParams = function (setting) {
    var deferred = Q.defer(),
        interval = setting.interval || 0x00018,
        latency = setting.latency || 0x0000,
        timeout = setting.timeout || 0x00c8;

    noble.setConnParameters(interval, latency, timeout);
    deferred.resolve();

    return deferred.promise;
};

nobleDrivers.connect = function (periph) {
    var deferred = Q.defer();

    periph._original.connect(function (err) {
        if (err) {
            if (err.message === 'Unknown Connection Identifier')
                deferred.reject(new Error('Connect Timeout'));
            else
                deferred.reject(err);
        } else
            deferred.resolve(periph.addr);
    });

    return deferred.promise;
};

nobleDrivers.connectCancel = function (periph) {
    var deferred = Q.defer();

    noble.connectCancel(periph._original.id);
    deferred.resolve(periph._original.id);

    return deferred.promise;
};

nobleDrivers.disconnect = function (periph) {
    return Q.ninvoke(periph._original, 'disconnect').then(function () {
        return periph.addr;
    });
};

nobleDrivers.updateLinkParam = function (periph, setting) {
    var deferred = Q.defer(),
        interval = setting.interval,
        latency = setting.latency,
        timeout = setting.timeout;

    noble._bindings.on('connUpdateComplete', function () {
        deferred.resolve();
    });
    noble.updateConnParameters(periph._original.id, interval, latency, timeout);

    return deferred.promise;
};

nobleDrivers.discAllServsAndChars = function (periph) {
    return Q.ninvoke(periph._original, 'discoverAllServicesAndCharacteristics').then(function (result) {
        var servs = result[0];

        _.forEach(servs, function (serv) {
            var servInfo = {
                    startHandle: serv._noble._bindings._gatts[serv._peripheralId]._services[serv.uuid].startHandle,
                    endHandle: serv._noble._bindings._gatts[serv._peripheralId]._services[serv.uuid].endHandle,
                    uuid: '0x' + serv.uuid,
                    original: serv,
                    charList: []
                };

            _.forEach(serv.characteristics, function (char) {
                var charInfo = {
                        uuid: '0x' + char.uuid,
                        handle: char.handle,
                        prop: char.properties,
                        original: char
                    };
                servInfo.charList.push(charInfo);
            });

            servs.push(servInfo);
        });
        return servs;
    });
};

nobleDrivers.read = function (char) {
    var uuid = char.uuid;

    return Q.ninvoke(char._original, 'read').then(function (data) {
        return Q.ninvoke(blePacket, 'parse', uuid, data);
    }).then(function (result) {
        char._original.value = result;
        return char._original.value;
    });
};

nobleDrivers.readDesc = function (char) {
    return Q.ninvoke(char._original, 'readDesc').then(function (data) {
        return Q.ninvoke(blePacket, 'parse', '0x2901', data);
    });
};

nobleDrivers.write = function (char, value, withoutResponse) {
    if (!Buffer.isBuffer(value))
        value = blePacket.frame(char.uuid, value);

    if (_.isNil(withoutResponse))
        withoutResponse = true;

    return Q.ninvoke(char._original, 'write', value, withoutResponse).then(function () {
        char._original.value = value;
    });
};

nobleDrivers.notify = function (char, config) {
    return Q.ninvoke(char._original, 'notify', config);
};

nobleDrivers.regChar = function (regObj, uuid) {
    blePacket.addMeta(uuid, {params: regObj.params, types: regObj.types});
};

nobleDrivers.regPeriphInfo = function (periphInfo) {
    var table = {};
    
    noble._bindings._addresses[periphInfo.id] = periphInfo.addr;
    noble._bindings._addresseTypes[periphInfo.id] = periphInfo.addressType;
};

nobleDrivers.regUuidHdlTable = function (periph) {
    
};

nobleDrivers.secure = function (periph) {
    noble.pair(periph._original.address, 0x03, 1, 0);

    // (address, ioCapabilities, pairingtype, data)
};

module.exports = nobleDrivers;
