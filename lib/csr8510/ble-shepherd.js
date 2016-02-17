var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var noble = require('../../../noble'),
    bledb = require('./bledb'),
    Peripheral = require('./peripheral'),
    bleutil = require('../util/bleutil'),
    GATTDEFS = require('../defs/gattdefs'),
    hciCharMeta = require('./characteristic/HciCharMeta');

var BShepherd = function() {
    this._permitState = 'off';
    this._syncSpinLock = 'off';
    this._syncDevs = [];
    this._connSpinLock = 'off';
    this._connDevs = [];
    this._peripherals = [];

    // user setting
    this.app = function () {};
    this.appInit = function () {};
    this.setScanRule = function () {};
    this.blackList = [];
};

util.inherits(BShepherd, EventEmitter);
var manager = new BShepherd();

BShepherd.prototype.start = function (bleApp) {
    if (_.isFunction(bleApp)) {
        this.app = bleApp;
    }
    
    noble.init();

    return this;
};

BShepherd.prototype.setNwkParams = function (type, setting, callback) {
    if (type !== 'scan' && type !== 'link') {
        throw new TypeError('type must be a string of scan of link.');
    }
    if (!_.isPlainObject(setting)) {
        throw new TypeError('setting must be an object.');
    }

    if (type === 'scan') {
        noble.setScanParameters(setting.interval, setting.window, function () {
            if (_.isFunction(callback)) { callback(null); }
        });
    } else if (type === 'link') {
        noble.setConnParameters(setting.interval, setting.latency, setting.timeout);
        if (_.isFunction(callback)) { callback(null); }
    }
};

BShepherd.prototype.permitJoin = function (time, callback) {
    var self = this;

    if (!_.isNumber(time)) { throw new Error('time must be number'); }

    this._permitState = 'on';
    setTimeout(function () {
        self._permitState = 'off';
    }, time * 1000);

    if (_.isFunction(callback)) { callback(null); }
};

BShepherd.prototype.find = function (addrOrHdl) {
    var obj = {};

    if (!_.isString(addrOrHdl) && !_.isNumber(addrOrHdl)) {
        throw new TypeError('addrOrHdl must be a string or a number');
    }

    if (_.isString(addrOrHdl)) {
        obj.addr = addrOrHdl;
    }
    if (_.isNumber(addrOrHdl)) {
        obj.connHdl = addrOrHdl;
    }

    return _.find(this._peripherals, obj);
};

BShepherd.prototype.regGattDefs = function (type, regObjs) {
    var enumName,
        uuid,
        errFlag = false,
        enumNewMem = {},
        errObj = {
            name: [],
            uuid: []
        };

    if (type === 'service') {
        enumName = 'ServUuid'; 
    } else if (type === 'characteristic') { 
        enumName = 'CharUuid'; 
    } else {
        throw new Error('type must be service or characteristic.');
    }

    if (!_.isObject(regObjs)) { throw new TypeError('regObjs must be an object or an array'); }

    _.forEach(regObjs, function (regObj) {
        if (_.isString(regObj.uuid)) { regObj.uuid = _.parseInt(regObj.uuid, 16);}

        if (GATTDEFS[enumName].get(regObj.name)) { 
            errFlag = true;
            errObj.name.push(regObj.name); 
        } 
        if (GATTDEFS[enumName].get(regObj.uuid)) { 
            errFlag = true;
            errObj.uuid.push(regObj.uuid); 
        }

        if (!errFlag) {
            enumNewMem[regObj.name] = regObj.uuid;
            GATTDEFS[enumName] = bleutil.addEnumMember(enumNewMem, GATTDEFS[enumName]);

            if (type === 'characteristic' && !_.isEmpty(regObj.params) && !_.isEmpty(regObj.types)) {
                uuid = '0x' + regObj.uuid.toString(16);
                hciCharMeta[uuid] = {
                    params: regObj.params,
                    types: regObj.types
                };
            }
        }
        errFlag = false;
    }); 

    if (_.isEmpty(errObj.name)) { delete errObj.name; }
    if (_.isEmpty(errObj.uuid)) { delete errObj.uuid; }

    return errObj;
};

BShepherd.prototype._pausePeriph = function () {
    var deferred = Q.defer(),
        onlinePeriph;


    onlinePeriph = _.find(this._peripherals, {state: 'online'});

    if (onlinePeriph) {
        onlinePeriph.disconnect(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                onlinePeriph.state = 'pause';
                deferred.resolve(onlinePeriph.addr);
            }
        });
    } else {
        deferred.reject(new Error('On-line device is not full.'));
    }

    return deferred.promise;
};


/*************************************************************************************************/
/*** Event Listeners                                                                           ***/
/*************************************************************************************************/
noble.on('stateChange', initDoneHdlr);
noble.on('discover', scanHdlr);

/*************************************************************************************************/
/*** Event Handlers                                                                            ***/
/*************************************************************************************************/
function initDoneHdlr (state) {
    var onConnFuncs = [],
        onlineDevs = [],
        pauseDevs = [];

    console.log('>> Central has completed initialization');

    if (state !== 'poweredOn') {
        noble.stopScanning();
    } else {
        manager.appInit();
        console.log('>> Loading devices from database.');
        loadPeriphsFromDB().then(function () {
            console.log('>> Asynchrnously connect devices in database.');
            _.forEach(noble._peripherals, function (peripheral) {
                onConnFuncs.push(function () {
                    var deferred = Q.defer();
                    peripheral.on('connect', function (err) {
                        if (err && err.message !== 'Connection Limit Exceeded') {
                            peripheral.state = 'discovered'; 
                            bledb.remove('peripheral', peripheral);
                            peripheral.removeAllListeners('connect');
                            deferred.resolve();
                        } else {
                            manager.on('IND', function (msg) {
                                if (msg.type === 'DEV_INCOMING' && msg.data === '0x' + peripheral.id) {
                                    peripheral.removeAllListeners('connect');
                                    onlineDevs.push(msg.data);
                                    deferred.resolve();
                                }
                            });

                        }
                    });
                    return deferred.promise;
                }());
            });
            manager.on('IND', function (msg) {
                if (msg.type === 'DEV_PAUSE') { pauseDevs.push(msg.data); }
            });
            return Q.all(onConnFuncs);
        }).then(function () {    
            manager.removeAllListeners('IND');
            manager.permitJoin(60);
            noble.startScanning();
            manager.app();
            notifPeriphState(onlineDevs, pauseDevs);
            console.log('>> Starting bleApp.');
        }).fail(function (err) {
            console.log('Problem occurs when starting central');
            console.log(err);
        }).done();
    }
}

function scanHdlr (peripheral) {
    var updateCharFlag = false,
        connTimeout,
        connectPeriph = _.find(manager._peripherals, {addr: '0x' + peripheral.id});

    if (peripheral.id === '7cd1c3245f08' || peripheral.id === 'c869cd78823c' || peripheral.id === 'd05fb820e1ff') { return; }
    if (connectPeriph && connectPeriph.state === 'pause') { return; }

    if (manager._connSpinLock === 'off') {
        manager._connSpinLock = 'on';

        connTimeout = setTimeout(function () {
            peripheral.connectCancel();
        }, 1500);

        bledb.hasInDB({id: peripheral.id}).then(function (result) {
            var newPeripheral,
                nextPeripheral;

            if (result) {
                updateCharFlag = true;
            }

            peripheral.connect(function (err) {

                manager._connSpinLock = 'off';
                clearTimeout(connTimeout);
                if (!err) {
                    newPeripheral = peripheralWrapper(peripheral);
                    sync(newPeripheral, updateCharFlag);              
                } else if (err.message === 'Connection Limit Exceeded') {
                    manager._pausePeriph().then(function (addr) {
                        scanHdlr(peripheral);
                        manager.emit('IND', {type: 'DEV_PAUSE', data: addr});
                    }).fail(function () {
                        setTimeout(function () {
                            scanHdlr(peripheral);
                        }, 3000);
                    }).done();
                }

                if (manager._permitState === 'on') {
                    noble.startScanning();
                }
                if (!_.isEmpty(manager._connDevs)) {
                    scanHdlr(manager._connDevs.shift());
                }
            }); 
        }).done();
    } else if (!_.find(manager._connDevs, {id: peripheral.id})) {
        manager._connDevs.push(peripheral);
    }
}

/*************************************************************************************************/
/*** Auxiliary Functions                                                                       ***/
/*************************************************************************************************/
function loadPeriphsFromDB () {
    var deferred = Q.defer(),
        periphs,
        servs,
        chars;

    bledb.getInfo('peripheral').then(function (peripherals) {
        periphs = peripherals;
        return bledb.getInfo('service');
    }).then(function (services) {
        servs = services;
        return bledb.getInfo('characteristic');
    }).then(function (chars) {
        _.forEach(periphs, function (periph) {
            var serviceUuids = [];
            
            noble._bindings._addresses[periph.id] = periph.address;
            noble._bindings._addresseTypes[periph.id] = periph.addressType;

            noble.onDiscover(periph.id, periph.address, periph.addressType,
                             true, periph.advertisement, periph.rssi);
        });

        deferred.resolve();
    }).fail(function(err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
}

function notifPeriphState (connPeriphs, pausePeriphs) {
    _.forEach(connPeriphs, function (periphAddr) {
        manager.emit('IND', {type: 'DEV_INCOMING', data: periphAddr});
    });

    _.forEach(pausePeriphs, function (periphAddr) {
        manager.emit('IND', {type: 'DEV_PAUSE', data: periphAddr});
    });
}

function peripheralWrapper (peripheral) {
    var newPeripheral;

    newPeripheral = _.find(manager._peripherals, function (periph) {
        return periph.addr === '0x' + peripheral.id;
    });

    if (!newPeripheral) {
        newPeripheral = new Peripheral(peripheral);
        manager._peripherals.push(newPeripheral);
        peripheral.on('disconnect', function () {
            newPeripheral.state = 'offline';
            console.log('Device: 0x' + peripheral.id + ' leave the network.');
            manager.emit('IND', {type: 'DEV_LEAVING', data: peripheral.addr});
        });
    }

    return newPeripheral;
}

function sync (peripheral, updateFlag) {
    var nextPeripheral;

    if (manager._syncSpinLock === 'off') {
        manager._syncSpinLock = 'on';

        peripheral.discServsAndChars(updateFlag).then(function () {
            if (!updateFlag) {
                return peripheral.save();
            } else {
                return;
            }
        }).then(function () {
            peripheral.state = 'online';
            console.log('Device: ' + peripheral.addr + ' join the network.');
            manager.emit('IND', {type: 'DEV_INCOMING', data: peripheral.addr});
        }).fail(function (err) {
            peripheral.disconnect();
            console.log('Device: 0x' + peripheral.addr + ' update GATT information failure with error: ' + err +'.');
        }).finally(function () {
            manager._syncSpinLock = 'off';
            if (!_.isEmpty(manager._syncDevs)) {
                nextPeripheral = manager._syncDevs.shift();
                sync(nextPeripheral.dev, nextPeripheral.updateFlag);
            }
        }).done();
    } else {
        manager._syncDevs.push({dev: peripheral, updateFlag: updateFlag});
    }
}


noble.on('scanStart', function () {
    console.log('----- scan start -----');
});
module.exports = manager;