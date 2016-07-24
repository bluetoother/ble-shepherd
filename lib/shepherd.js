/* jshint node: true */
'use strict';

var EventEmitter = require('events'),
    util = require('util'),
    Q = require('q'),
    async = require('async-kit'),
    _ = require('busyman'),
    Objectbox = require('objectbox');

var bconfig = require('./config/config'),
    GATTDEFS = require('./defs/gattdefs');

var Central = require('./model/central'),
    Controller = require('./components/controller'),
    processor = require('./components/periph_processor'),
    loader = require('./components/loader'),
    butil = require('./components/bleutil');

/***********************************************************************/
/*** Shepherd Class                                                  ***/
/***********************************************************************/
function BShepherd (subModule) {
    var self = this,
        _blackList = [],
        _whiteList = [],
        permitJoinTime = 0;

    EventEmitter.call(this);

    /***************************************************/
    /*** Protected Memebers                          ***/
    /***************************************************/
    this._subModule = subModule;
    this._controller = new Controller(subModule);
    this._periphBox = new Objectbox(__dirname + '/database/ble.db');
    this._enable = 'pending';
    this._connNum = 0;
    this._plugins = {};
    this._permitJoinTimer = null;
    this._blockerState = null;
    this._spCfg = null;

    this.bleCentral = null;

    this.app = function () {};
    this.appInit = function () {};
    this.setScanRule = function () {};

    processor = processor(this);
    loader = loader(this);

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

    this.isBlackListed = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');
        return _.includes(_blackList, permAddr.toLowerCase());
    };

    this.ban = function (permAddr, callback) {
        this._ban(permAddr, callback);
    };

    this.unban = function (permAddr, callback) {
        this._unban(permAddr, callback);
    };

    this.isWhiteListed = function (permAddr) {
        if (!_.isString(permAddr))
            throw new TypeError('permAddr should be a string.');

        return _.includes(_whiteList, permAddr.toLowerCase());
    };

    this.allow = function (permAddr, callback) {
        this._unban(permAddr, callback);
    };

    this.disallow = function (permAddr, callback) {
        this._ban(permAddr, callback);
    };

    this._ban = function (permAddr, callback) {
        var periph;

        if (!callback) callback = function () {};

        if (!this._blockerState)
            callback(new Error('You should enable blocker first.')); 
        else {
            _.remove(_whiteList, function (n) {             // remove from whitelist
                return n === permAddr.toLowerCase();
            });

            if (!this.isBlackListed(permAddr))              // add to blacklist
                _blackList.push(permAddr.toLowerCase());    

            periph = this.find(permAddr);

            if (periph) 
                periph.remove(callback);
            else 
                callback(null);
        }
    };

    this._unban = function (permAddr, callback) {
        var err = null;

        if (!callback) callback = function () {};

        if (!this._blockerState) 
            err = new Error('You should enable blocker first.'); 
        else {

            if (!this.isWhiteListed(permAddr))              // add to whitelist
                _whiteList.push(permAddr.toLowerCase());

            _.remove(_blackList, function (n) {             // remove from blacklist
                return n === permAddr.toLowerCase();
            });
        }

        process.nextTick(function () {
            callback(err);
        });
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
    /***Event Listeners                                                ***/
    /*********************************************************************/
    this._controller.on('bnpReady', this._onBnpReady.bind(this));
    this._controller.on('discover', this._onDiscover.bind(this));
    this._controller.on('devOnline', this._onDevOnline.bind(this));
    this._controller.on('devOffline', this._onDevOffline.bind(this));
    this._controller.on('linkParamUpdate', this._onLinkParamUpdate.bind(this));
    this._controller.on('charNotif', this._onCharNotif.bind(this));
    this._controller.on('charChanged', this._onCharChanged.bind(this));
    this._controller.on('linkParamUpdate', this._onLinkParamUpdate.bind(this));
    this._controller.on('passkeyNeeded', this._onPasskeyNeeded.bind(this));
}

util.inherits(BShepherd, EventEmitter);

BShepherd.prototype.start = function (bleApp, spCfg, callback) {
    var self = this,
        deferred = Q.defer();

    if (_.isFunction(spCfg)) {
        callback = spCfg;
        spCfg = null;
    }

    if (!_.isFunction(bleApp))
        throw new Error('app must be an function');
    if (!_.isNull(spCfg) && (!_.isPlainObject(spCfg) || _.isUndefined(spCfg.path))) 
        throw new Error('spConfig must be an object and should have path property');

    this.app = bleApp;
    this._spCfg = spCfg;

    if (self._subModule !== 'noble')
        process.on('SIGINT', self._onSignin);
        process.on('asyncExit', self._onAsyncExit);

    this._controller.init(this._spCfg).done(function (centralAddr) {
        self.bleCentral = new Central(centralAddr);
        self._controller.once('ready', function () {
            self._enable = true;
            deferred.resolve();
        });
        self._controller.emit('bnpReady');
    }, function (err) {
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
        this._controller.cancelScan();

        _.forEach(periphs, function (periph) {
            disconnPeriphs.push(periph.disconnect.bind(periph));
        });

        butil.seqResolveQFuncs(disconnPeriphs).then(function () {
            return self._controller.close();
        }).done(function () {
            _.forEach(periphs, function (periph) {
                self._periphBox.removeElement(periph._id);
            });
            self.removeAllListeners('IND');
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

    this.stop().then(function () {
        setTimeout(function () {
            return self.start(self.app, self._spCfg);
        }, 100);
    }).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.setNwkParams = function (type, setting, callback) {
    var deferred = Q.defer(),
        cmdName;

    if (type === 'scan') 
        cmdName = 'setScanParams';
     else if (type === 'link') 
        cmdName = 'setLinkParams';

    if (!cmdName) 
        throw new TypeError('type must be a string of scan or link');
    
    if (!_.isPlainObject(setting)) 
        throw new TypeError('setting must be an object.');

    this._controller[cmdName](setting).then(function () {
        deferred.resolve();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.permitJoin = function (duration, callback) {
    var self = this;

    if (!_.isNumber(duration)) { throw new Error('duration must be a number'); }

    if (this._permitJoinTimer) {
        clearInterval(this._permitJoinTimer);
        self._permitJoinTimer = null;
    }

    this.setPermitJoinTime(duration);

    this._permitJoinTimer = setInterval(function () {
        if (0 === self.joinTimeCountdown()) {
            clearInterval(self._permitJoinTimer);
            self._permitJoinTimer = null;
            self.emit('IND', {type: 'NWK_PERMITJOIN', data: 0});
        }
    }, 1000);

    if (duration !== 0)
        this.emit('IND', {type: 'NWK_PERMITJOIN', data: duration});

    return this;
};

BShepherd.prototype.maintain = function () {
    var periphs = this._periphBox.exportAllObjs(),
        updatePeriphs = [];

    _.forEach(periphs, function (periph) {
        updatePeriphs.push(periph.update.bind(periph));
    });

    return butil.seqResolveQFuncs(updatePeriphs);
};

BShepherd.prototype.blocker = function (onOff, type) {
    if (!onOff)
        this._blockerState = null;
    else {
        if (!type) type = 'black';
        this._blockerState = type;
    }

    return this;
};

BShepherd.prototype.listDevices = function () {
    var periphs = this._periphBox.exportAllObjs();

    return _.map(periphs, function (periph) {
        var servList = {};

        _.forEach(periph.servs, function (serv) {
            var charIds = _.map(serv.chars, function (char) {
                return char.uuid;
            });
            servList[serv.uuid] = charIds;
        });
        return {
            addr: periph.addr,
            addrType: periph.addrType,
            status: periph.status,
            connHdl: periph.connHdl,
            servList: servList
        };
    });
};

BShepherd.prototype.find = function (addrOrHdl) {
    if (!_.isString(addrOrHdl) && !_.isNumber(addrOrHdl)) {
        throw new TypeError('addrOrHdl must be a string or a number');
    }

    if (_.isString(addrOrHdl)) {
        addrOrHdl = addrOrHdl.toLowerCase();
        return this._periphBox.find(function (periph) {
            return periph.addr === addrOrHdl;
        });
    }
    if (_.isNumber(addrOrHdl)) 
        return this._periphBox.find(function (periph) {
            return periph.connHdl === addrOrHdl;
        });
};

BShepherd.prototype.regGattDefs = function (type, regObjs) {
    var self = this,
        enumName,
        enumNewMem = {},
        uuid;

    if (type === 'service') 
        enumName = 'ServUuid'; 
    else if (type === 'characteristic') 
        enumName = 'CharUuid'; 
    else 
        throw new Error('type must be service or characteristic.');

    if (!_.isObject(regObjs)) 
        throw new TypeError('regObjs must be an object or an array');

    _.forEach(regObjs, function (regObj) {
        if (_.isString(regObj.uuid)) 
            regObj.uuid = _.parseInt(regObj.uuid, 16);

        if (GATTDEFS[enumName].get(regObj.name)) 
            throw new Error(type + ' name of ' + regObj.name + ' is conflict with GATT specifications.');
        
        if (GATTDEFS[enumName].get(regObj.uuid)) 
            throw new Error(type + ' uuid of ' + regObj.uuid + ' is conflict with GATT specifications.');

        enumNewMem[regObj.name] = regObj.uuid;
        GATTDEFS[enumName] = butil.addEnumMember(enumNewMem, GATTDEFS[enumName]);

        if (type === 'characteristic' && !_.isEmpty(regObj.params) && !_.isEmpty(regObj.types)) {
            uuid = '0x' + regObj.uuid.toString(16);
            self._controller.regChar(regObj, uuid);
        }
    }); 

    return this;
};

BShepherd.prototype.regLocalServ = function (servInfo, callback) {
    var deferred = Q.defer(),
        serv;

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
            console.log('>> Local service registered!');
            deferred.resolve(result);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }  

    return deferred.promise.nodeify(callback);
};

BShepherd.prototype.regPlugin = function (devName, plugin) {
    var self = this,
        plugged = false,
        plg;

    if (!_.isString(devName))
        throw new Error('devName should be a string');

    if (!_.isPlainObject(plugin))
        throw new Error('plugin should be an object');

    if (!plugin.examine || !_.isFunction(plugin.examine))
        throw new Error('You should provide examine function');

    plg = _.find(this._plugins, function (p) {
        return p === plugin.examine;
    });

    if (!plg) {
        this._plugins[devName] = plugin.examine;

        if (plugin.gattDefs)
            _.forEach(plugin.gattDefs, function (defs, type) {
                self.regGattDefs(type, defs);
            });

        plugged = true;
    }

    return plugged;
};

BShepherd.prototype.unregPlugin = function (plugin) {
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

BShepherd.prototype._examinePeriph = function (periph) {
    var plugins = this._plugins;
    _.forEach(plugins, function (examFunc, periphName) {
        var basicInfo = {
            devName: periph.findChar('0x1800', '0x2a00').val.name,
            manufacturer: periph.findChar('0x180a', '0x2a29').val.manufacturerName,
            model: periph.findChar('0x180a', '0x2a24').val.modelNum,
            serial: periph.findChar('0x180a', '0x2a25').val.serialNum,
            fwRev: periph.findChar('0x180a', '0x2a26').val.firmwareRev,
            hwRev: periph.findChar('0x180a', '0x2a27').val.hardwareRev,
            swRev: periph.findChar('0x180a', '0x2a28').val.softwareRev
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
        if (msg.type === 'DEV_INCOMING') {
            count += 1;
            result.online.push(msg.data);
        } else if (msg.type === 'DEV_IDLE') {
            result.idle.push(msg.data);
        }

        if (count !== devNum) return;
        self.removeListener('IND', devHdlr);
        self._controller.removeListener('connectErr', errHdlr);
        deferred.resolve(result);
    };
    errHdlr = function () {
        count += 1;

        if (count !== devNum) return;
        self.removeListener('IND', devHdlr);
        self._controller.removeListener('connectErr', errHdlr);
        deferred.resolve(result);
    };

    this.on('IND', devHdlr);
    this._controller.on('connectErr', errHdlr);

    return deferred.promise;
};


/*************************************************************************************************/
/*** Event Handler                                                                             ***/
/*************************************************************************************************/
BShepherd.prototype._onBnpReady = function () {
    var self = this,
        linkParams;

    console.log('>> Central has completed initialization');

    if (this._subModule !== 'noble')
        linkParams = bconfig.ccbnplinkParams;
    else
        linkParams = bconfig.noblelinkParams;

    if (this._enable === 'pending') 
        this.appInit();

    this._controller.setLinkParams(linkParams).then(function () {
        return self._controller.setScanParams(bconfig.scanParams);
    }).then(function () {
        console.log('>> Loading devices from database.');
        return loader.reloadPeriphs();
    }).then(function (num) {
        console.log('>> Asynchrnously connect devices in database.');

        if (num !== 0) 
            return self._collectReloadPeriphs(num);
    }).then(function (rPeriphs) {
        console.log('>> Starting bleApp.');
        self._controller.emit('ready');
        self._controller.scan();
        self.app(self);
        if (rPeriphs) {
            _.forEach(rPeriphs.online, function (periph) {
                self.emit('IND', { type: 'DEV_INCOMING', data: periph });
            });
            _.forEach(rPeriphs.idle, function (periphAddr) {
                self.emit('IND', { type: 'DEV_IDLE', data: periphAddr });
            });
        }
    }).fail(function (err) {
        console.log('Problem occurs when starting central');
        console.log(err);
    }).done();
};

BShepherd.prototype._onDiscover = function (periphInfos) {
    var self = this,
        periph,
        connFlag = false,
        nextScan;

    if (this._enable !== true || this.getPermitJoinTime()) {
        _.forEach(periphInfos, function (periphInfo) {
            periph = processor.newPeriph(periphInfo);

            if (periph.status === 'idle') 
                return;

            if (!self._blockerState ||
                (self._blockerState === 'white' &&  self.isWhiteListed(periph.addr)) ||
                (self._blockerState === 'black' && !self.isBlackListed(periph.addr))) {
                if (_.isNil(periph._id))
                    self.regPeriph(periph);
                connFlag = true;
                processor.connPeriph(periph);
            }
        });
}    else 
        _.forEach(periphInfos, function (periphInfo) {
            periph = self.find(periphInfo.addr);

            if (periph && periph.status === 'offline') {
                connFlag = true;
                periph.status = 'online';
                processor.connPeriph(periph);
            }
        });

    if (this._enable === 'pending') return;

    nextScan = function () {
        if (self.getPermitJoinTime()) 
            self._controller.scan();
        else 
            self._controller.scan();    // [TODO] scan for long interval
    };

    if (connFlag) 
        this._controller.once('allConnected', function () {
            nextScan();
        });
    else 
        nextScan();
};

BShepherd.prototype._onDevOnline = function (periphInfo) { // sync to the remote periph
    var self = this,
        periph = this.find(periphInfo.periphId),
        oldPeriph;

    this._connNum += 1;
    this.emit('IND', { type: 'DEV_ONLINE', data: periph.addr });

    if (!_.isNil(periphInfo.linkParams)) 
        periph.linkParams = periphInfo.linkParams;
    if (!_.isNil(periphInfo.connHandle)) 
        periph.connHdl = periphInfo.connHandle;
    if (!_.isNil(periph._original))
        periph.connHdl = periph._original._noble._bindings._handles[periph._original.id];

    processor.syncPeriph(periph).done(function () {
        periph.status = 'online';
        periph = self._examinePeriph(periph);
        self._periphBox.update(periph._id, function () {});
        self.emit('IND', {type: 'DEV_INCOMING', data: periph});
        console.log('Device: ' + periph.addr + ' join the network.');
    }, function (err) {
        periph.disconnect();
        console.log('Peripheral: ' + periph.addr + ' synchronize failure with error: ' + err +'.');
    });
};

BShepherd.prototype._onDevOffline = function (periphInfo) {
    var periph = this.find(periphInfo.periphId);

    this._connNum -= 1;
    periph.connHdl = null;

    if (periph.status === 'online') {
        periph.status = 'offline';
        this.emit('IND', { type: 'DEV_LEAVING', data: periph.addr });
        console.log('Peripheral: ' + periph.addr + ' leave the network.');
    }
};

BShepherd.prototype._onCharNotif = function (charInfo) {
    var periph = this.find(charInfo.periphId),
        serv,
        servUuid,
        char,
        oldVal,
        path = '';

    if (!_.isNil(charInfo.servUuid)) {
        servUuid = charInfo.servUuid;
        char = periph.findChar(servUuid, charInfo.charUuid);
    } else {
        serv = _.find(periph.servs, function (serv) {
            return charInfo.charId > serv.startHdl && charInfo.charId < serv.endHdl;
        });
        servUuid = serv.uuid;
        char = periph.findChar(serv.uuid, charInfo.charId);
    }

    oldVal = char.val;
    char.val = charInfo.value;
    char.processInd(charInfo.value);

    if (!_.isEqual(oldVal, charInfo.value)) {
        path = 'servs.' + servUuid + '.chars.' + char.hdl + '.val';
        this._periphBox.replace(periph._id, path, charInfo.value, function () {});
    }

    if (charInfo.type === 'attInd')
        this._controller.indCfm(periph.connHdl);
};

BShepherd.prototype._onCharChanged = function (charInfo) {
    var periph = this.find(charInfo.periphId),
        char = periph.findChar(charInfo.servUuid, charInfo.charUuid),
        path = '';

    if (!periph._id || periph.status !== 'online') 
        return;

    path = 'servs.' + charInfo.servUuid + '.chars.' + char.hdl + '.' + charInfo.type;

    this._periphBox.replace(periph._id, path, charInfo.value, function () {});
};

BShepherd.prototype._onLinkParamUpdate = function (linkParamInfo) {
    var periph = this.find(linkParamInfo.connHandle);

    delete linkParamInfo.periphId;
    periph.linkParams = linkParamInfo;
};

BShepherd.prototype._onPasskeyNeeded = function (data) {
    this.emit('IND', { type: 'PASSKEY_NEED', data: data });
};

module.exports = BShepherd;