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
            deferred.resolve(noble.address);
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
    var deferred = Q.defer();  

    noble.stopScanning(function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve();
    });

    return deferred.promise;
};

nobleDrivers.onDiscover = function (id, address, addressType, connectable, advertisement, rssi) {
    noble.onDiscover(id, address, addressType, connectable, advertisement, rssi);
};

nobleDrivers.setScanParams = function (setting) {
    var deferred = Q.defer(),
        time = setting.time || 10240,
        interval = setting.interval || 16,
        windows = setting.window || 16;

    noble.setScanParameters(interval, windows, function (err) {
        deferred.resolve();
    });

    return deferred.promise;
};

nobleDrivers.setLinkParams = function (setting) {
    var deferred = Q.defer(),
        interval = setting.interval || 0x000c,
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
    var deferred = Q.defer();

    periph._original.disconnect(function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(periph.addr);
    });

    return deferred.promise;
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
    var deferred = Q.defer();

    periph._original.discoverAllServicesAndCharacteristics(function (err, servs, chars) {
        if (err)
            deferred.reject(err);
        else {
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
                            handle: char._noble._bindings._gatts[char._peripheralId]._characteristics[char._serviceUuid][char.uuid].valueHandle,
                            prop: char.properties,
                            original: char
                        };
                    servInfo.charList.push(charInfo);
                });

                servs.push(servInfo);

            });
            deferred.resolve(servs);
        }
    });

    return deferred.promise;
};

nobleDrivers.read = function (char) {
    var deferred = Q.defer();

    char._original.read(function (err, data) {
        var uuid = char.uuid;

        if (err) {
            deferred.reject(err);
        } else {
            if (uuid.length === 34) { uuid =  '0x' + uuid.slice(6, 10);}
            blePacket.parse(uuid, data, function (err, result) {
                if (err)
                    deferred.reject(err);
                else {
                    char._original.value = result;
                    deferred.resolve(char._original.value);
                }
            });
        }
    });

    return deferred.promise;
};

nobleDrivers.readDesc = function (char) {
    var deferred = Q.defer();

    char._original.readDesc(function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            blePacket.parse('0x2901', data, function(err, result) {
                if (err)
                    deferred.reject(err);
                else {
                    deferred.resolve(result);
                }
            });
        }
    });

    return deferred.promise;
};

nobleDrivers.write = function (char, value) {
    var deferred = Q.defer();

    if (!Buffer.isBuffer(value))
        value = blePacket.frame(char.uuid, value);

    char._original.write(value, true, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            char._original.value = value;
            deferred.resolve();
        }
    });

    return deferred.promise;
};

nobleDrivers.notify = function (char, config) {
    var deferred = Q.defer();

    char._original.notify(config, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve();
    });

    return deferred.promise;
};

nobleDrivers.regChar = function (regObj, uuid) {
    blePacket.addMeta(uuid, {params: regObj.params, types: regObj.types});
};

nobleDrivers.regPeriphInfo = function (periphInfo) {
    var table = {};
    
    noble._bindings._addresses[periphInfo.id] = periphInfo.addr;
    noble._bindings._addresseTypes[periphInfo.id] = periphInfo.addressType;
};

module.exports = nobleDrivers;
