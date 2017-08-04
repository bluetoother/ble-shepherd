/* jshint node: true */
'use strict';

var ccbnp = require('cc-bnp'),
    _ = require('busyman'),
    Q = require('q');

var GATTDEFS = require('../defs/gattdefs'),
    GAPDEFS = require('../defs/gapdefs');

var ccbnpDrivers = {};

ccbnpDrivers.init = function (spCfg) {
    var deferred = Q.defer();

    ccbnp.init(spCfg, 'central').done(function (result) {
        deferred.resolve(result.devAddr);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

ccbnpDrivers.close = function () {
    return this.reset(1).then(function () {
        return ccbnp.close();
    });
};

ccbnpDrivers.reset = function (mode) {
    if (mode === 0 || mode === 'soft') 
        return ccbnp.hci.resetSystem(0);
    else if (!mode || mode === 1 || mode === 'hard')
        return ccbnp.hci.resetSystem(1);
};

ccbnpDrivers.scan = function () {
    var self = this,
        advDatas = {},
        periphInfos;

    return ccbnp.gap.deviceDiscReq(3, 1, 0).then(function (result) {
        _.forEach(result.collector.GapDeviceInfo, function (devInfo) {
            advDatas[devInfo.addr] = { adv: null, rssi:  devInfo.rssi };
            advDatas[devInfo.addr].adv = advDatas[devInfo.addr].adv ? advDatas[devInfo.addr].adv : new Buffer([]);
            advDatas[devInfo.addr].adv = Buffer.concat([advDatas[devInfo.addr].adv, devInfo.dataField]);
        });

        _.forEach(advDatas, function (advRawData, addr) {
            advDatas[addr].adv = parseAdvData(advRawData.adv);
            advDatas[addr].adv.rssi = advRawData.rssi;
        });

        periphInfos = result.collector.GapDeviceDiscovery[0].devs;
        periphInfos = periphInfos || [];

        _.forEach(periphInfos, function (periphInfo) {
            periphInfo.advertisement = advDatas[periphInfo.addr].adv;
        });

        return periphInfos;
    });
};

ccbnpDrivers.cancelScan = function () {
    return ccbnp.gap.deviceDiscCancel();
};

ccbnpDrivers.setScanParams = function (setting) {
    var time = setting.time || 2000,
        interval = setting.interval || 16,
        windows = setting.window || 16;

    return ccbnp.gap.setParam(2, time).then(function (result) {
        return ccbnp.gap.setParam(16, interval);
    }).then(function (result) {
        return ccbnp.gap.setParam(17, windows);
    });
};

ccbnpDrivers.setLinkParams = function (setting) {
    var interval = setting.interval || 0x0018,
        latency = setting.latency || 0x0000,
        timeout = setting.timeout || 0x00c8;

    return ccbnp.gap.setParam(21, interval).then(function () {
        return ccbnp.gap.setParam(22, interval);
    }).then(function () {
        return ccbnp.gap.setParam(26, latency);
    }).then(function () {
        return ccbnp.gap.setParam(25, timeout);
    });
};

ccbnpDrivers.setBondParam = function (paramId, value) {
    return ccbnp.gap.bondSetParam(paramId, value.length, value);
};

ccbnpDrivers.connect = function (periph) {
    var deferred = Q.defer(),
        addrType;

    addrType = periph.addrType;
    if (!_.isNumber(addrType))
        addrType = addrType === 'random' ? 0x01 : 0x00;

    this.cancelScan().then(function () {
        return ccbnp.gap.estLinkReq(1, 0, addrType, periph.addr);
    }, function () {
        return ccbnp.gap.estLinkReq(1, 0, addrType, periph.addr);
    }).done(function (result) {
        var addr = result.collector.GapLinkEstablished[0].addr;

        if (addr === '0x000000000000')
            deferred.reject(new Error('Connect Timeout'));
        else 
            deferred.resolve(addr);
    }, function (err) {
        if (err.message === 'bleNoResources') 
            deferred.reject(new Error('Connection Limit Exceeded'));
        else 
            deferred.reject(err);
    });

    return deferred.promise;
};

ccbnpDrivers.connectCancel = function (periph) {
    return ccbnp.gap.terminateLink(65534, 19).then(function (result) {
        return result.addr;
    });
};

ccbnpDrivers.disconnect = function (periph) {
    return this.cancelScan().then(function () {
        return ccbnp.gap.terminateLink(periph.connHandle, 19);
    }, function () {
        return ccbnp.gap.terminateLink(periph.connHandle, 19);
    });
};

ccbnpDrivers.updateLinkParam = function (periph, setting) {
    var interval = setting.interval,
        latency = setting.latency,
        timeout= setting.timeout;

    return ccbnp.gap.updateLinkParamReq(periph.connHandle, interval, interval, latency, timeout);
};

ccbnpDrivers.discAllServsAndChars = function (periph) {
    var deferred = Q.defer(),
        servs = [],
        discChars = [];

    ccbnp.gatt.discAllPrimaryServices(periph.connHandle).then(function (result) {
        _.forEach(result.collector.AttReadByGrpTypeRsp, function (evtObj) {
            var servObj;

            if (evtObj.status === 0) { 
                servObj = evtObj.data;
                for (var i = 0; i < (_.keys(servObj).length / 3); i += 1) {
                    servs.push({
                        startHandle: servObj['attrHandle' + i],
                        endHandle: servObj['endGrpHandle' + i],
                        uuid: servObj['attrVal' + i],
                        charList : []
                    });
                }
            }
        });

        return servs;
    }).then(function (servs) {
        _.forEach(servs, function (serv) {
            if (serv.startHandle === serv.endHandle) return;

            discChars.push((function () {
                return ccbnp.gatt.discAllChars(periph.connHandle, serv.startHandle, serv.endHandle).then(function (result) {
                    var charInfos = [];

                    _.forEach(result.collector.AttReadByTypeRsp, function (evtObj) {
                        var data = evtObj.data;
                        if (evtObj.status !== 0) return;

                        for(var i = 0; i < (_.keys(data).length / 2); i += 1) {
                            charInfos.push(data[['attrVal' + i]]);
                        }
                    });

                    _.forEach(charInfos, function (charInfo) {
                        var prop = [];
                        _.forEach(GATTDEFS.Prop._enumMap, function (propVal, propName) {
                            if (charInfo.prop & propVal)
                                prop.push(propName);
                        });
                        charInfo.prop = prop;
                        charInfo.handle = charInfo.hdl;
                        serv.charList.push(charInfo);
                    });
                    return;
                });
            }()));
        });

        return Q.all(discChars);
    }).done(function (result) {
        deferred.resolve(servs);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

ccbnpDrivers.passkeyUpdate = function (periph, passkey) {
    return ccbnp.gap.passkeyUpdate(periph.connHandle, passkey);
};

ccbnpDrivers.authenticate = function (periph, ioCap, mitm, bond) {
    var self = this,
        keyDist = GAPDEFS.KeyDistList.get('All').value,
        cmdResult;

    bond = bond ? 0x01 : 0x00;
    mitm = mitm ? 0x04 : 0x00;

    return ccbnp.gap.authenticate(periph.connHandle, ioCap, 0, new Buffer(16).fill(0), mitm | bond, 16, keyDist, 0, 0, 0, 0, 16, keyDist)
    .then(function (result) {
        return result.collector.GapAuthenticationComplete[0];
    });
};

ccbnpDrivers.terminateAuth = function (periph) {
    return ccbnp.gap.terminateAuth(periph.connHandle, 3);
};

ccbnpDrivers.bond = function (periph, mitm, setting) {
    return ccbnp.gap.bond(periph.connHandle, mitm, setting.ltk, setting.div, setting.rand, setting.ltk.length);
};

ccbnpDrivers.read = function (char) {
    return ccbnp.gatt.readCharValue(char._service._peripheral.connHandle, char.handle, char.uuid).then(function (result) {
        return result.collector.AttReadRsp[0].value;
    });
};

ccbnpDrivers.readDesc = function (char) {
    var startHandle,
        endHandle;

    startHandle = char.handle;
    endHandle = getEndHdl(char._service, endHandle);

    return ccbnp.gatt.readUsingCharUuid(char._service._peripheral.connHandle, startHandle, endHandle, '0x2901').then(function (result) {
        return result.collector.AttReadByTypeRsp[0].data.attrVal0;
    });
};

ccbnpDrivers.write = function (char, value) {
    var cmd;

    if (_.includes(char.prop, 'write')) 
        cmd = 'writeCharValue';
    else if (_.includes(char.prop, 'writeWithoutResponse')) 
        cmd = 'writeNoRsp';

    return ccbnp.gatt[cmd](char._service._peripheral.connHandle, char.handle, value, char.uuid);
};

ccbnpDrivers.notify = function (char, config, oldDeferred) {
    var startHandle,
        endHandle;

    startHandle = char.handle;
    endHandle = getEndHdl(char._service, startHandle); 

    if (config === false) 
        config = {properties: 0x0000};
    else if (_.includes(char.prop, 'notify') && (config === true)) 
        config = {properties: 0x0001};
    else if (_.includes(char.prop, 'indicate') && (config === true))
        config = {properties: 0x0002};

    return ccbnp.gatt.readUsingCharUuid(char._service._peripheral.connHandle, startHandle, endHandle, '0x2902').then(function (result) {
        return ccbnp.gatt.writeCharValue(char._service._peripheral.connHandle, result.collector.AttReadByTypeRsp[0].data.attrHandle0, config, '0x2902');
    });
};

ccbnpDrivers.indCfm = function (connHandle) {
    return ccbnp.att.handleValueCfm(connHandle);
};

ccbnpDrivers.regChar = function (regObj, uuid) {
    return ccbnp.regChar(regObj);
};

ccbnpDrivers.regUuidHdlTable = function (periph) {
    var table = {};
    
    _.forEach(periph.servs, function (serv) {
        _.forEach(serv.chars, function (char) {
            table[char.handle] = char.uuid;
        });
    });

    if (_.isNumber(periph.connHandle)) 
        ccbnp.regUuidHdlTable(periph.connHandle, table);
};

function getEndHdl (serv, startHandle) { 
    var endHandle = [];

    _.forEach(serv.chars, function (char) {
        if (char.handle > startHandle) { endHandle.push(char.handle); }
    });

    if (endHandle[0]) 
        endHandle = endHandle[0] - 1;
    else 
        endHandle = serv.endHandle;

    return endHandle;
}

function parseAdvData (rawData) {
    var i = 0,
        serviceUuid,
        advData = {};

    while ((i+1) < rawData.length) {
        var length = rawData.readUInt8(i);

        if (length < 1) {
            return rawData;
        }

        var dataType = rawData.readUInt8(i + 1); // https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile

        if ((i + length + 1) > dataType.length) {
            return rawData;
        }

        var bytes = rawData.slice(i + 2).slice(0, length - 1);

        switch(dataType) {
            case 0x01:
                advData.flags = bytes.readUInt8(0);
                break;

            case 0x02: // Incomplete List of 16-bit Service Class UUID
            case 0x03: // Complete List of 16-bit Service Class UUIDs
                if (_.isNil(advData.serviceUuids))
                    advData.serviceUuids = [];

                for (var j = 0; j < bytes.length; j += 2) {
                    serviceUuid = bytes.readUInt16LE(j).toString(16);

                    if (advData.serviceUuids.indexOf(serviceUuid) === -1) {
                        advData.serviceUuids.push(serviceUuid);
                    }
                }
                break;

            case 0x06: // Incomplete List of 128-bit Service Class UUIDs
            case 0x07: // Complete List of 128-bit Service Class UUIDs
                if (_.isNil(advData.serviceUuids))
                    advData.serviceUuids = [];

                for (j = 0; j < bytes.length; j += 16) {
                    serviceUuid = bytes.slice(j, j + 16).toString('hex').match(/.{1,2}/g).reverse().join('');
                    if (advData.serviceUuids.indexOf(serviceUuid) === -1) {
                        advData.serviceUuids.push(serviceUuid);
                    }
                }
                break;

            case 0x08: // Shortened Local Name
            case 0x09: // Complete Local Name»
                advData.localName = bytes.toString('utf8');
                break;

            case 0x0a: // Tx Power Level
                advData.txPowerLevel = bytes.readInt8(0);
                break;

            case 0x12:
                advData.connInterval = {
                    min: bytes.readUInt16LE(0),
                    max: bytes.readUInt16LE(0)
                };
                break;

            case 0x16: // Service Data, there can be multiple occurences
                var serviceDataUuid = bytes.slice(0, 2).toString('hex').match(/.{1,2}/g).reverse().join('');
                var serviceData = bytes.slice(2, bytes.length);

                if (_.isNil(advData.serviceData))
                    advData.serviceData = [];

                advData.serviceData.push({
                    uuid: serviceDataUuid,
                    data: serviceData
                });
                break;

            case 0xff: // Manufacturer Specific Data
                advData.manufacturerData = bytes;
                break;
        }

        i += (length + 1);
    }

    return advData;
}

module.exports = ccbnpDrivers;

// localName: "<name>",
// txPowerLevel: <int>,
// serviceUuids: ["<service UUID>", ...],
// connInterval
// manufacturerData: <Buffer>,
// serviceData


// flags
// serviceUuids
// localName
// txPowerLevel
// connInterval
// serviceData
// manufacturerData