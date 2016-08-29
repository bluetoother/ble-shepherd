/* jshint node: true */
'use strict';

var EventEmitter = require('events'),
    util = require('util'),
    Q = require('q'),
    async = require('async-kit'),
    _ = require('busyman'),
    Objectbox = require('objectbox'),
    debug = require('debug')('ble-shepherd');

var GATTDEFS = require('./defs/gattdefs');

var Central = require('./model/central'),
    Controller = require('./components/controller'),
    Blocker = require('./components/blocker'),
    periphProcesspr = require('./components/periph_processor'),
    bnpListeners = require('./components/bnp_event_listeners'),
    butil = require('./components/bleutil');


/***********************************************************************/
/*** Shepherd Class                                                  ***/
/***********************************************************************/
function BShepherd (subModule, path, opts) {
    var self = this,
        spConfig,
        permitJoinTime = 0;

    EventEmitter.call(this);

    if (subModule !== 'cc-bnp' && subModule !== 'noble')
        throw new Error('subModule must be given with cc-bnp or noble');

    if (subModule === 'cc-bnp') {
        if (!path || !_.isString(path))
            throw new Error('path must be given in string');

        spConfig = {};
        spConfig.path = path;
        spConfig.options = opts ? opts : undefined;
    }

    /***************************************************/
    /*** Protected Memebers                          ***/
    /***************************************************/
    this._subModule = subModule;
    this._controller = new Controller(subModule, this);
    this._periphProcessor = periphProcesspr(this);
    this._periphBox = new Objectbox(__dirname + '/database/ble.db');

    this._enable = 'pending';
    this._resetting = false;
    this._permitJoinTimer = null;
    this._spCfg = spConfig ? spConfig : null;

    this._plugins = {};

    this.bleCentral = null;
    this.blocker = new Blocker(this);

    bnpListeners.attachEventListeners(this);

    this.setScanRule = function () {};

    /*********************************************************************/
    /*** Privileged Methods                                            ***/
    /*********************************************************************/
    this.setPermitJoinTime = function (time) {
        permitJoinTime = time;
        return permitJoinTime;
    };
    this.getPermitJoinTime = function () {
        return permitJoinTime;
    };
    this.joinTimeCountdown = function () {
        permitJoinTime = permitJoinTime > 0 ? permitJoinTime - 1 : 0;
        return permitJoinTime;
    };

    this._onSignin = function () {
        var sigIntListeners = process.listeners('SIGINT');

        if (sigIntListeners[sigIntListeners.length - 1] === this._onSignin)
            async.exit();
    }.bind(self);

    this._onAsyncExit  = function (code, time, callback) {
        var self = this;
        this.stop(function () {
            self._controller.reset(1);
        });
    }.bind(self);

    /*********************************************************************/
    /*** Error Handler                                                 ***/
    /*********************************************************************/
    var errHdlr = function (err) {
        self.emit('error', err);
    };

    this.on('_error', errHdlr);
    this._controller.on('error', errHdlr);
}

util.inherits(BShepherd, EventEmitter);


/***********************************************************************/
/*** Public Methods                                                  ***/
/***********************************************************************/
BShepherd.prototype.start = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (self._subModule !== 'noble')
        process.on('SIGINT', self._onSignin);
        process.on('asyncExit', self._onAsyncExit);

    this._controller.init(this._spCfg).done(function (centralAddr) {
        self.bleCentral = new Central(centralAddr);
        self.once('ready', function () {
            self._enable = true;
            deferred.resolve();
        });
        self._controller.emit('bnpReady');
    }, function (err) {
        if (!callback)
            self.emit('_error', err);

        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.stop = function (callback) {
    var self = this,
        deferred = Q.defer(),
        pjTime = this.getPermitJoinTime(),
        periphs = this._periphBox.exportAllObjs(),
        disconnPeriphs = [];

    if (!this._enable) 
        deferred.resolve();
    else {
        this._enable = false;
        this.permitJoin(0);
        
        _.forEach(periphs, function (periph) {
            disconnPeriphs.push(periph.disconnect.bind(periph));
        });

        butil.seqResolveQFuncs(disconnPeriphs).then(function () {
            return self._controller.cancelScan();
        }).then(function () {
            return self._controller.close();
        }).fail(function (err) {
            return self._controller.close();
        }).done(function () {
            _.forEach(periphs, function (periph) {
                self._periphBox.removeElement(periph._id);
            });
            self.removeAllListeners('ind');
            deferred.resolve();
        }, function (err) {
            self.enable = true;
            self.permitJoin(pjTime);
            self._controller.scan();
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.reset = function (callback) {
    var self = this,
        deferred = Q.defer(),
        periphs;

    this._resetting = true;

    this.stop().then(function () {
        self._resetting = false;
        return self.start().delay(100);
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.tuneScan = function (setting, callback) {
    var deferred = Q.defer();

    if (!_.isPlainObject(setting)) 
        throw new TypeError('setting must be an object.');

    this._controller.setScanParams(setting).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.tuneLink = function (setting, callback) {
    var deferred = Q.defer();

    if (!_.isPlainObject(setting)) 
        throw new TypeError('setting must be an object.');

    this._controller.setLinkParams(setting).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.permitJoin = function (duration) {
    var self = this;

    if (!_.isNumber(duration)) 
        throw new TypeError('duration must be a number');

    if (this._permitJoinTimer) {
        clearInterval(this._permitJoinTimer);
        self._permitJoinTimer = null;
    }

    this.setPermitJoinTime(duration);

    this.emit('permitJoining', duration);

    if (duration !== 0) 
        this._permitJoinTimer = setInterval(function () {
            if (0 === self.joinTimeCountdown()) {
                clearInterval(self._permitJoinTimer);
                self._permitJoinTimer = null;
            }

            self.emit('permitJoining', self.getPermitJoinTime());
        }, 1000);   

    return this;
};

BShepherd.prototype.list = function (addrs) {
    var self = this,
        periphs = this._periphBox.exportAllObjs(),
        getPeriphInfo,
        foundPeriphs = [];

    getPeriphInfo = function (periph) {
        var servList = _.map(periph.servs, function (serv) {
            var charList = _.map(serv.chars, function (char) {
                return {
                    uuid: char.uuid,
                    handle: char.handle
                };
            });

            return {
                uuid: serv.uuid,
                handle: serv.handle,
                charList: charList
            };
        });

        return {
            addr: periph.addr,
            addrType: periph.addrType,
            status: periph.status,
            connHandle: periph.connHandle,
            servList: servList ? servList : []
        };
    };

    if (_.isString(addrs))
        addrs = [ addrs ];

    if (!_.isNil(addrs) && !_.isArray(addrs))
        throw new TypeError('addrs should be a string or an array of strings if given.');

    if (_.isNil(addrs)) 
        _.forEach(periphs, function (periph) {
            foundPeriphs.push(getPeriphInfo(periph));
        });
    else if (_.isArray(addrs)) 
        _.forEach(addrs, function (addr) {
            var found = self.find(addr);

            if (found) {
                foundPeriphs.push(getPeriphInfo(found));
            }
        });

    return foundPeriphs;
};

BShepherd.prototype.find = function (addrOrHdl) {
    if (!_.isString(addrOrHdl) && !_.isNumber(addrOrHdl)) 
        throw new TypeError('addrOrHdl must be a string or a number');

    if (_.isString(addrOrHdl)) {
        addrOrHdl = addrOrHdl.toLowerCase();
        return this._periphBox.find(function (periph) {
            return periph.addr === addrOrHdl;
        });
    }
    if (_.isNumber(addrOrHdl)) 
        return this._periphBox.find(function (periph) {
            return periph.connHandle === addrOrHdl;
        });
};

BShepherd.prototype.remove = function (addrOrHdl, callback) {
    var self = this,
        deferred = Q.defer(),
        periph = this.find(addrOrHdl),
        rmvAndEmit;

    rmvAndEmit = function (deferred) {
        self._periphBox.remove(periph._id, function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                debug('Peripheral: ' + periph.addr + ' leave the network.');

                self.emit('ind', { type: 'devLeaving', periph: periph.addr, data: periph.addr });
                deferred.resolve();
            }
        });
    };

    if (!periph) 
        deferred.resolve();
    else {
        if (_.isNil(periph.connHandle)) {
            rmvAndEmit(deferred);
        } else { 
            this._controller.disconnect(periph).then(function () {
                rmvAndEmit(deferred);
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
        }
    }

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.declare = function (type, regObjs) {
    var self = this,
        enumName;

    if (type === 'service') 
        enumName = 'ServUuid'; 
    else if (type === 'characteristic') 
        enumName = 'CharUuid'; 
    else 
        throw new TypeError('type must be service or characteristic.');

    if (!_.isObject(regObjs)) 
        throw new TypeError('regObjs must be an object or an array');

    _.forEach(regObjs, function (regObj) {
        var enumNewMem = {},
            uuid = regObj.uuid,
            name = regObj.name,
            uuidNum;

        uuidNum = _.isString(uuid) ? _.parseInt(uuid, 16) : uuid;

        var existName = GATTDEFS[enumName].get(name),
            existUuid = GATTDEFS[enumName].get(uuidNum);

        if (existName && !_.isEqual(existName, existUuid)) 
            throw new Error(type + ' name of ' + name + ' is conflict with GATT specifications.');
        
        if (existUuid && !_.isEqual(existName, existUuid)) 
            throw new Error(type + ' uuid of ' + uuid + ' is conflict with GATT specifications.');

        enumNewMem[name] = uuidNum;
        GATTDEFS[enumName] = butil.addEnumMember(enumNewMem, GATTDEFS[enumName]);

        if (type === 'characteristic' && !_.isEmpty(regObj.params) && !_.isEmpty(regObj.types)) {
            self._controller.regChar(regObj, uuid);
        }
    }); 

    return this;
};

BShepherd.prototype.mount = function (servInfo, callback) {
    var deferred = Q.defer(),
        serv;

    if (this._subModule === 'noble') 
        throw new Error('This command not supported with noble submodule.');

    if (!servInfo || !_.isPlainObject(servInfo)) { 
        throw new TypeError('servInfo must be an object'); 
    }
    if (!_.isArray(servInfo.charsInfo)) { 
        throw new TypeError('servInfo.charsInfo must be an array.'); 
    }
    if (!_.isString(servInfo.uuid) || !_.startsWith(servInfo.uuid, '0x')) {  
        throw new TypeError('servInfo.uuid must be a string and start with 0x');
    }

    if (_.indexOf(this.bleCentral.servs, serv) !== -1) {
        deferred.reject(new Error('Local service already exist. You need to delete the old before add a new.'));
    } else {
        this.bleCentral.regServ(servInfo).then(function (result) {
            debug('Local service registered!');
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }  

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.support = function (devName, plugin) {
    var self = this,
        plugged = false,
        plg;

    if (!_.isString(devName))
        throw new TypeError('devName should be a string');

    if (!_.isPlainObject(plugin))
        throw new TypeError('plugin should be an object');

    if (!plugin.examine || !_.isFunction(plugin.examine))
        throw new Error('You should provide examine function');

    plg = _.find(this._plugins, function (p) {
        return p === plugin.examine;
    });

    if (!plg) {
        this._plugins[devName] = plugin.examine;

        if (plugin.gattDefs)
            _.forEach(plugin.gattDefs, function (defs, type) {
                self.declare(type, defs);
            });

        plugged = true;
    }

    return plugged;
};

BShepherd.prototype.unSupport = function (plugin) {
    var unplugged = false,
        plg = _.remove(this._plugins, function (p) {
            return p === plugin;
        });

    if (plg.length)
        unplugged = true;

    return unplugged;
};

BShepherd.prototype.regPeriph = function (periph, callback) {
    var deferred = Q.defer(),
        oldPeriph,
        periphId = periph._id;

    if (!_.isNil(periphId))
        oldPeriph = this._periphBox.get(periphId);

    if (oldPeriph) 
        deferred.reject(new Error('peripheral exists, unregister it first.'));
    else if (periph._recovered)
        this._periphBox.set(periphId, periph, function (err, id) {
            if (err)
                deferred.reject(err);
            else {
                periph._recovered = false;
                delete periph._recovered;
                deferred.resolve(id);
            }
        });
    else
        this._periphBox.add(periph, function (err, id) {
            if (err)
                deferred.reject(err);
            else {
                periph._id = id;
                deferred.resolve(id);
            }
        });

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.unregPeriph = function (periph, callback) {
    var deferred = Q.defer();

    this._periphBox.remove(periph._id, function (err) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve();
    });

    return deferred.promise.nodeify(callback);
};

/***********************************************************************/
/*** Private Methods                                                 ***/
/***********************************************************************/
BShepherd.prototype._examinePeriph = function (periph) {
    var plugins = this._plugins;

    _.forEach(plugins, function (examFunc, periphName) {
        var basicInfo = {
            devName: periph.findChar('0x1800', '0x2a00').value.name,
            manufacturer: periph.findChar('0x180a', '0x2a29').value.manufacturerName,
            model: periph.findChar('0x180a', '0x2a24').value.modelNum,
            serial: periph.findChar('0x180a', '0x2a25').value.serialNum,
            fwRev: periph.findChar('0x180a', '0x2a26').value.firmwareRev,
            hwRev: periph.findChar('0x180a', '0x2a27').value.hardwareRev,
            swRev: periph.findChar('0x180a', '0x2a28').value.softwareRev
        };

        if (examFunc(periph, basicInfo)) {
            periph.name = periphName;
            return false;
        }
    });

    return periph;
};

BShepherd.prototype._collectReloadPeriphs = function (devNum) {
    var self = this,
        deferred = Q.defer(),
        count = 0,
        devHdlr,
        errHdlr,
        result = {
            online: [],
            idle: []
        };

    devHdlr = function (msg) {
        if (msg.type === 'devIncoming') {
            count += 1;
            result.online.push(msg.periph);
        } else if (msg.type === 'devStatus' && msg.data === 'idle') {
            result.idle.push(msg.periph);
        }

        if (count !== devNum) return;
        self.removeListener('ind', devHdlr);
        self._controller.removeListener('connectErr', errHdlr);
        deferred.resolve(result);
    };
    errHdlr = function () {
        count += 1;

        if (count !== devNum) return;
        self.removeListener('ind', devHdlr);
        self._controller.removeListener('connectErr', errHdlr);
        deferred.resolve(result);
    };

    this.on('ind', devHdlr);
    this._controller.on('connectErr', errHdlr);

    return deferred.promise;
};

module.exports = BShepherd;