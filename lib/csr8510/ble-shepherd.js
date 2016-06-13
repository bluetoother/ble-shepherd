var Q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    blePacket = require('ble-char-packet');

var noble = require('noble'),
    bledb = require('./bledb'),
    Peripheral = require('./peripheral'),
    bleutil = require('../util/bleutil'),
    GATTDEFS = require('../defs/gattdefs');

var scanEmptyCount = 0;

var BShepherd = function() {
    var _blackList = [],
        _whiteList = [];

    this._enable = 'pending';
    this._permitState = 'pending';
    this._permitTimer = null;
    this._blackOrWhite = null;
    this._syncSpinLock = 'off';
    this._syncDevs = [];
    this._connSpinLock = 'off';
    this._connDevs = [];
    this._peripherals = [];
    this._plugins = {};

    this._onDevIncomings = [];
    this._onDevPaused = function () {};

    this.bleCentral = noble.address;

    this.app = function () {};
    this.appInit = function () {};
    this.setScanRule = function () {};

    this.isBlackListed = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');
        return _.includes(_blackList,permAddr.toLowerCase());
    };

    this.clearBlacklist = function () {
        _blackList = null;
        _blackList = [];
        return this;
    };

    this.toBlack = function (permAddr) {
        if (!this.isBlackListed(permAddr))
            _blackList.push(permAddr.toLowerCase());

        return this;
    };

    this.cancelToBlack = function (permAddr) {
        _.remove(_blackList, function (n) {
            return n === permAddr.toLowerCase();
        });

        return this;
    };

    this.isWhiteListed = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');
        return _.includes(_whiteList, permAddr.toLowerCase());
    };

    this.toWhite = function (permAddr) {
        if (!this.isWhiteListed(permAddr))
            _whiteList.push(permAddr.toLowerCase());

        return this;
    };

    this.cancelToWhite = function (permAddr) {
        _.remove(_whiteList, function (n) {
            return n === permAddr.toLowerCase();
        });

        return this;
    };
};

util.inherits(BShepherd, EventEmitter);
var manager = new BShepherd();

BShepherd.prototype.start = function (bleApp, callback) {
    var self = this,
        stateChangeHdlr;

    if (!callback) callback = function () {};

    stateChangeHdlr = function(state) {
        if (state === 'poweredOn') {
            noble.removeListener('stateChange', stateChangeHdlr);
            initDoneHdlr(function (err) {
                if (err) {
                    callback(err);
                } else {
                    self._enable = true;
                    callback(null);
                }
            });
        }
    };

    if (_.isFunction(bleApp)) 
        this.app = bleApp;
    else 
        this.app = function (central) {};

    noble.on('stateChange', stateChangeHdlr);

    noble.init();
};

BShepherd.prototype.stop = function (callback) {
    if (!callback) callback = function () {};

    if (!this._enable) {
        callback(null);
    } else {
        this.permitJoin(0);
        this._peripherals.forEach(function (peripheral) {
            peripheral.disconnect();
        });
        noble.close();
        callback(null);
    }
};

BShepherd.prototype.reset = function (callback) {
    var self = this;

    if (!callback) callback = function () {};

    this.stop(function (err) {
        if (err) {
            callback(err);
        } else {
            self.start(function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }
    });
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

BShepherd.prototype.permitJoin = function (duration) {
    var self = this;

    if (!_.isNumber(duration)) { throw new Error('duration must be a number'); }

    if (this._permitTimer) {
        clearTimeout(this._permitTimer);
        this._permitTimer = null;
    }

    this._permitState = 'on';
    this._permitTimer = setTimeout(function () {
        self._permitState = 'off';
        clearTimeout(self._permitTimer);
        self._permitTimer = null;
        self.emit('IND', {type: 'NWK_PERMITJOIN', data: 0});
    }, duration * 1000);

    this.emit('IND', {type: 'NWK_PERMITJOIN', data: duration});

    return this;
};

BShepherd.prototype.listDevices = function () {
    return _.map(this._peripherals, function (periph) {
        return periph.dump();
    });
};

BShepherd.prototype.find = function (addrOrHdl) {
    var obj = {};

    if (!_.isString(addrOrHdl) && !_.isNumber(addrOrHdl)) {
        throw new TypeError('addrOrHdl must be a string or a number');
    }
    
    if (_.isString(addrOrHdl)) {
        obj.addr = addrOrHdl.toLowerCase();
    }
    if (_.isNumber(addrOrHdl)) {
        obj.connHdl = addrOrHdl;
    }

    return _.find(this._peripherals, obj);
};

BShepherd.prototype.maintain = function () {
    // TODO
};

BShepherd.prototype.regGattDefs = function (type, regObjs) {
    var enumName,
        uuid,
        enumNewMem = {};

    if (type === 'service') {
        enumName = 'ServUuid'; 
    } else if (type === 'characteristic') { 
        enumName = 'CharUuid'; 
    } else {
        throw new Error('type must be service or characteristic.');
    }

    if (!_.isObject(regObjs)) { throw new TypeError('regObjs must be an object or an array'); }

    _.forEach(regObjs, function (regObj) {
        if (_.isString(regObj.uuid)) { regObj.uuid = _.parseInt(regObj.uuid, 16); }

        if (GATTDEFS[enumName].get(regObj.name)) { 
            throw new Error(type + ' name of ' + regObj.name + ' is conflict with GATT specifications.');
        } 
        if (GATTDEFS[enumName].get(regObj.uuid)) { 
            throw new Error(type + ' uuid of ' + regObj.uuid + ' is conflict with GATT specifications.');
        }

        enumNewMem[regObj.name] = regObj.uuid;
        GATTDEFS[enumName] = bleutil.addEnumMember(enumNewMem, GATTDEFS[enumName]);

        if (type === 'characteristic' && !_.isEmpty(regObj.params) && !_.isEmpty(regObj.types)) {
            uuid = '0x' + regObj.uuid.toString(16);
            blePacket.addMeta(uuid, {params: regObj.params, types: regObj.types});
        }
    }); 

    return this;
};

BShepherd.prototype.registerPlugin = function (devName, plugin) {
    var self = this,
        plugged = false,
        plg = _.find(this._plugins, function (p) {
            return p === plugin.analysis;
        });

    if (!plugin.analysis || !_.isFunction(plugin.analysis))
        throw new Error('You should provide analysis function');

    if (!plg) {
        this._plugins[devName] = plugin.analysis;

        if (plugin.gattDefs)
            _.forEach(plugin.gattDefs, function (defs, type) {
                self.regGattDefs(type, defs);
            });

        plugged = true;
    }

    return plugged;
};

BShepherd.prototype.unregisterPlugin = function (plugin) {
    var unplugged = false,
        plg = _.remove(this._plugins, function (p) {
            return p === plugin;
        });

    if (plg.length)
        unplugged = true;

    return unplugged;
};

BShepherd.prototype.enableBlackOrWhite = function (onOff, type) {
    if (!onOff)
        this._blackOrWhite = null;
    else {
        this._blackOrWhite = type;
    }
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
        deferred.reject(new Error('No on-line device.'));
    }

    return deferred.promise;
};


/*************************************************************************************************/
/*** Event Listeners                                                                           ***/
/*************************************************************************************************/
// noble.on('stateChange', initDoneHdlr);
noble.on('discover', scanHdlr);

/*************************************************************************************************/
/*** Event Handlers                                                                            ***/
/*************************************************************************************************/
function initDoneHdlr (callback) {
    var onConnFuncs = [],
        onlineDevs = [],
        pauseDevs = [],
        onDevIncoming;

    if (!callback) callback = function () {};

    console.log('>> Central has completed initialization');

    if (manager._enable === 'pending') manager.appInit();

    console.log('>> Loading devices from database.');
    loadPeriphsFromDB().then(function () {
        console.log('>> Asynchrnously connect devices in database.');

        _.forEach(noble._peripherals, function (peripheral) {
            onConnFuncs.push(function () {
                var deferred = Q.defer();
                peripheral.on('connect', function (err) {
                    if (err && err.message !== 'Connection Limit Exceeded') {
                        removeDevFromDb(deferred, peripheral);
                    } else {
                        onDevIncoming = function (msg) {
                            if (msg.type === 'DEV_INCOMING' && msg.data.addr === '0x' + peripheral.id) {
                                peripheral.removeAllListeners('connect');
                                manager.removeAllListeners('SYNC_ERROR:0x' + peripheral.id);
                                onlineDevs.push(msg.data);
                                deferred.resolve();
                            }
                        };
                        manager._onDevIncomings.push(onDevIncoming);

                        manager.on('IND', onDevIncoming);
                        manager.once('SYNC_ERROR:0x' + peripheral.id, function () {
                            removeDevFromDb(deferred, peripheral);
                        });
                    }
                });
                return deferred.promise;
            }());
        });
        manager._onDevPaused  = function (msg) {
            if (msg.type === 'DEV_PAUSE') { pauseDevs.push(msg.data); }
        };
        manager.on('IND', manager._onDevPaused);
        return Q.all(onConnFuncs);
    }).then(function () {   
        _.forEach(manager._onDevIncomings, function (func) {
            manager.removeListener('IND', func);
        });
        manager.removeListener('IND', manager._onDevPaused);
        noble.startScanning();
        manager.app(manager);
        notifPeriphState(onlineDevs, pauseDevs);
        console.log('>> Starting bleApp.');
        callback(null);
    }).fail(function (err) {
        console.log('Problem occurs when starting central');
        console.log(err);
        callback(err);
    }).done();
}

function scanHdlr (peripheral) {
    var updateCharFlag,
        connTimeout,
        connectPeriph = _.find(manager._peripherals, {addr: '0x' + peripheral.id});

    // if (_.includes(manager.blacklist, '0x' + peripheral.id)) { return; }
    if (manager._blackOrWhite === 'white') {
        if (!manager.isWhiteListed('0x' + peripheral.id)) { return; }
    } else if (manager._blackOrWhite === 'black') {
        if (manager.isBlackListed('0x' + peripheral.id)) { return; }
    }
    
    if (manager._permitState === 'off' && !connectPeriph) { return; }
    if (connectPeriph && connectPeriph.state === 'pause') { return; }

    if (manager._connSpinLock === 'off') {
        manager._connSpinLock = 'on';

        bledb.hasInDB({id: peripheral.id}).then(function (result) {
            var newPeripheral,
                nextPeripheral;

            updateCharFlag = result ? true : false;

            connTimeout = setTimeout(function () {
                peripheral.connectCancel();
            }, 1500);

            peripheral.connect(function (err) {
                manager._connSpinLock = 'off';
                clearTimeout(connTimeout);
                if (!err) {
                    newPeripheral = peripheralWrapper(peripheral);
                    syncPeriph(newPeripheral, updateCharFlag);
                    manager.emit('IND', {type: 'DEV_ONLINE', data: newPeripheral.addr});              
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
                } else if (manager._permitState === 'off') {
                    scanEmptyCount += 1;
                    applyScanRule(scanEmptyCount);
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
        if (_.isEmpty(periphs))
            noble._peripherals = {};

        deferred.resolve();
    }).fail(function(err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
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
            manager.emit('IND', {type: 'DEV_LEAVING', data: '0x' + peripheral.id});
        });
        peripheral.on('attrInd', function (msg) {
            manager.emit('IND', {type: 'ATT_IND', data: msg});
        });
    }

    return newPeripheral;
}

function syncPeriph (peripheral, updateFlag) {
    var periph,
        nextPeripheral;

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
            peripheral = analysisPeriph(peripheral);
            console.log('Device: ' + peripheral.addr + ' join the network.');
            manager.emit('IND', {type: 'DEV_INCOMING', data: peripheral});
        }).fail(function (err) {
            console.log('Device: ' + peripheral.addr + ' update GATT information failure with error: ' + err +'.');
            manager.emit('SYNC_ERROR:' + peripheral.addr);
            peripheral.disconnect();
        }).finally(function () {
            manager._syncSpinLock = 'off';
            if (!_.isEmpty(manager._syncDevs)) {
                nextPeripheral = manager._syncDevs.shift();
                syncPeriph(nextPeripheral.periph, nextPeripheral.updateFlag);
            }
        }).done();
    } else {
        manager._syncDevs.push({periph: peripheral, updateFlag: updateFlag});
    }
}

function removeDevFromDb (deferred, peripheral) {
    peripheral.state = 'discovered'; 
    bledb.remove('peripheral', peripheral);
    peripheral.removeAllListeners('connect');
    deferred.resolve();
}

function notifPeriphState (connPeriphs, pausePeriphs) {
    _.forEach(connPeriphs, function (periph) {
        periph = analysisPeriph(periph);
        manager.emit('IND', {type: 'DEV_INCOMING', data: periph});
    });

    _.forEach(pausePeriphs, function (periphAddr) {
        manager.emit('IND', {type: 'DEV_PAUSE', data: periphAddr});
    });
}

function applyScanRule (times) {
    var interval = 3000;

    if (!_.isFunction(manager.setScanRule)) {
        return;
    }

    interval = manager.setScanRule(times) || interval;
    setTimeout(function () {
        noble.startScanning();
    }, interval);
}

function analysisPeriph (periph) {
    _.forEach(manager._plugins, function (analysisFunc, periphName) {
        var basicInfo = {
            devName: periph.servs['0x1800'].chars['0x2a00'].val.name,
            manufacturer: periph.servs['0x180a'].chars['0x2a29'].val.manufacturerName,
            model: periph.servs['0x180a'].chars['0x2a24'].val.modelNum,
            serial: periph.servs['0x180a'].chars['0x2a25'].val.serialNum,
            version: {
                fw: periph.servs['0x180a'].chars['0x2a26'].val.firmwareRev,
                hw: periph.servs['0x180a'].chars['0x2a27'].val.hardwareRev,
                sw: periph.servs['0x180a'].chars['0x2a28'].val.softwareRev,
            }
        };

        if (analysisFunc(periph, basicInfo))
            periph.name = periphName;
    });

    return periph;
}

module.exports = manager;