/* jshint node: true */
'use strict';

var Q = require('q'),
    _ = require('busyman'),
    butil = require('../components/bleutil'),
    Security = require('../components/security'),
    Service = require('./service');

function Peripheral (periphInfo) {
    this._id = null;
    this._controller = null;
    this._original = periphInfo.original ? periphInfo.original : null;
    this._secMdl = null;

    this._indCount = 0;
    this._cmdCount = 0;

    this.parent = null;
    this.role = 'peripheral';
    this.addr = periphInfo.addr;
    this.addrType = periphInfo.addrType;
    this.status = 'disc'; //disc, online, offline, idle
    this.joinTime = null;
    this.connHdl = !_.isNil(periphInfo.connHdl) ? periphInfo.connHdl : null;
    this.linkParams  = null;
    this.servs = {};
    this.sm = null;
    this.name = null;
}


/***********************************************************************/
/*** Public Methods                                                  ***/
/***********************************************************************/
Peripheral.prototype.connect = function (callback) {
    var self = this,
        deferred = Q.defer(),
        controller = this._controller,
        shepherd = controller.getShepherd(),
        periphOnlineHdlr,
        errHdlr;

    if (!_.isNil(this.connHdl)) {
        this.status = 'online';
        deferred.resolve();
    } else {
        periphOnlineHdlr = function (msg) {
            if (msg.type === 'DEV_INCOMING' && msg.data.addr === self.addr) {
                controller.removeListener('connectErr', errHdlr);
                shepherd.removeListener('IND', periphOnlineHdlr);
                deferred.resolve();
            }
        };
        errHdlr = function (msg) {
            if (msg.addr === self.addr) {
                controller.removeListener('connectErr', errHdlr);
                shepherd.removeListener('IND', periphOnlineHdlr);
                deferred.reject(msg.err);
            }
        };

        controller.on('connectErr', errHdlr);
        shepherd.on('IND', periphOnlineHdlr);

        shepherd._periphProcessor.connPeriph(this);
    }

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.disconnect = function (callback) {
    var deferred = Q.defer();

    if (_.isNil(this.connHdl)) {
        this.status = 'offline';
        deferred.resolve();
    } else {
        this._controller.disconnect(this).done(function (result) {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.remove = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (_.isNil(this.connHdl)) {
        this._controller.getShepherd()._periphBox.remove(this._id, function (err) {
            if (err)
                deferred.reject(err);
            else 
                deferred.resolve();
        });
    } else { 
        this._controller.disconnect(this).then(function () {
            self._controller.getShepherd()._periphBox.remove(self._id, function (err) {
                if (err)
                    deferred.reject(err);
                else 
                    deferred.resolve();
            });
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.update = function (callback) {
    var self = this,
        deferred = Q.defer(),
        notUpdate = ['0x1800', '0x1801', '0x180a'],
        updateChars = [];

    _.forEach(this.servs, function (serv) {
        if (_.includes(notUpdate, serv.uuid)) return;

        _.forEach(serv.chars, function (char) {
            if (_.includes(char.prop, 'read'))
                updateChars.push(char.read.bind(char));
        });
    });

    if (_.isNil(this.connHdl) && this.status === 'offline') 
        deferred.reject(new Error('Peripheral is not online.'));
    else if (this._synchronizing)
        butil.seqResolveQFuncs(updateChars).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    else 
        this._wakeUp().then(function () {
            return butil.seqResolveQFuncs(updateChars);
        }).done(function () {
            self._cmdCount += 1;
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.updateLinkParam = function (interval, latency, timeout, callback) {
    var self = this,
        deferred = Q.defer(),
        setting = {};

    if (!_.isNumber(interval) || !_.isNumber(latency) || !_.isNumber(timeout)) 
        throw new Error('interval, latency and timeout must be number.');
    
    setting.interval = interval;
    setting.latency = latency;
    setting.timeout= timeout;

    if (this.status === 'offline')  
        deferred.reject(new Error('Device is not online.'));
    else
        this._wakeUp().then(function () {
            return self._controller.updateLinkParam(self, setting);
        }).done(function () {
            self._cmdCount += 1;
            self.linkParams = setting;
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });


    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.encrypt = function (setting, callback) {
    var self = this,
        deferred = Q.defer();

    if (_.isFunction(setting)) {
        callback = setting;
        setting = null;
    } else if (setting && !_.isPlainObject(setting)) {
        throw new TypeError('setting must be an object');
    }

    if (!this._secMdl) { 
        this._secMdl = new Security(setting); 
        this._secMdl._peripheral = this; 
    } else if (setting) {
        _.forEach(setting, function (val, key) {
            if (self._secMdl[key]) 
                self._secMdl[key] = val;
        });
    }

    if (this._controller.subModule === 'noble') 
        deferred.reject(new Error('This command not supported with submodule noble.'));
    else if (this.state === 'offline')  // [TODO]
        deferred.reject(new Error('Device is not online.'));
    else 
        this._wakeUp().then(function () {
            return self._secMdl.init();
        }).then(function () {
            return self._secMdl.pairing();
        }).then(function (result) {
            self._secMdl.state = 'encrypted';
            if (self._secMdl.bond) 
                return self._secMdl.bonding(); 
            else 
                return;
        }).done(function () {
            self._cmdCount += 1;
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.passPasskey = function (passkey, callback) {
    var self = this,
        deferred = Q.defer();

    if (!_.isString(passkey) || _.size(passkey) !== 6 || _.isNaN(_.parseInt(passkey)))
        throw new Error('Passkey must be a string of length 6.');

    if (this._controller.subModule === 'noble') 
        deferred.reject(new Error('This command not supported with submodule noble.'));
    else if (this.state === 'offline')  
        deferred.reject(new Error('Device is not online.'));
    else 
        this._wakeUp().then(function () {
            return self._secMdl.passPasskey(passkey);
        }).done(function () {
            self._cmdCount += 1;
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);

};

Peripheral.prototype.dump = function () {
    var servs = {};

    _.forEach(this.servs, function (serv) {
        servs[butil.shrinkUuid(serv.uuid)] = serv.dump();
    });
    return {
        addr: this.addr,
        addrType: this.addrType,
        servs: servs
    };
};

Peripheral.prototype.attatchServs = function (servInfos) {
    var self = this;

    _.forEach(servInfos, function (servInfo) {
        var serv = new Service(servInfo, self),
            uuid = serv.uuid;

        uuid = butil.shrinkUuid(uuid);
        
        self.servs[uuid] = serv;
    });
};

Peripheral.prototype.findServ = function (uuidServ) {
    if (!_.isString(uuidServ) || !_.startsWith(uuidServ, '0x')) 
        throw new Error('uuidServ must be a string and start with 0x');

    uuidServ = butil.shrinkUuid(uuidServ).toLowerCase();

    return this.servs[uuidServ];
};

Peripheral.prototype.findChar = function (uuidServ, uuidChar) {
    var serv = this.findServ(uuidServ);

    if (serv) {
        if (_.isNumber(uuidChar)) 
            return serv.chars[uuidChar];
        else if(_.isString(uuidChar) && _.startsWith(uuidChar, '0x')) 
            return _.find(serv.chars, function (char) {
                return butil.shrinkUuid(char.uuid) === butil.shrinkUuid(uuidChar);
            });
        else {
            throw new Error('uuidChar must be a number or a string start with 0x');
        }
    } else {
        return;
    }
};

Peripheral.prototype.read = function (uuidServ, uuidChar, callback) {
    var self = this,
        deferred = Q.defer(),
        char;

    char = self.findChar(uuidServ, uuidChar);

    if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else 
        this._wakeUp().then(function () {
            char = self.findChar(uuidServ, uuidChar);

            if (!char) 
                return new Error('Can not find characteristic.');
            else
                return char.read();
        }).done(function (result) {
            if (result instanceof Error) {
                deferred.reject(result);
            } else {
                self._cmdCount += 1;
                deferred.resolve(result);
            }
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.readDesc = function (uuidServ, uuidChar, callback) {
    var self = this,
        deferred = Q.defer(),
        char;

    char = self.findChar(uuidServ, uuidChar);

    if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else
        this._wakeUp().then(function () {
            char = self.findChar(uuidServ, uuidChar);

            if (!char) 
                return new Error('Can not find characteristic.');
            else
                return char.readDesc();
        }).done(function (result) {
            if (result instanceof Error) {
                deferred.reject(result);
            } else {
                self._cmdCount += 1;
                deferred.resolve(result);
            }
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.write = function (uuidServ, uuidChar, value, callback) {
    var self = this,
        deferred = Q.defer(),
        char;

    char = self.findChar(uuidServ, uuidChar);

    if (_.isNil(value) || (!_.isPlainObject(value) && !Buffer.isBuffer(value))) 
        throw new TypeError('value must be an object or a buffer');

    if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else
        this._wakeUp().then(function () {
            char = self.findChar(uuidServ, uuidChar);

            if (!char) 
                return new Error('Can not find characteristic.');
            else
                return char.write(value);
        }).done(function (result) {
            if (result instanceof Error) {
                deferred.reject(result);
            } else {
                self._cmdCount += 1;
                deferred.resolve();
            }
        }, function (err) {
            deferred.reject(err);
        });
    
    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.setNotify = function (uuidServ, uuidChar, config, callback) {
    var self = this,
        deferred = Q.defer(),
        char;

    char = self.findChar(uuidServ, uuidChar);

    if (!_.isBoolean(config)) 
        throw new TypeError('config must be a boolean');

    if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else
        this._wakeUp().then(function () {
            char = self.findChar(uuidServ, uuidChar);

            if (!char) 
                return new Error('Can not find characteristic.');
            else
                return char.notify(config);
        }).done(function (result) {
            if (result instanceof Error) {
                deferred.reject(result);
            } else {
                self._cmdCount += 1;
                deferred.resolve();
            }
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.regCharHdlr = function (uuidServ, uuidChar, fn) {
    var char = this.findChar(uuidServ, uuidChar);

    if (!_.isFunction(fn)) 
        throw new TypeError('fn must be a function'); 
    
    if (char) 
        char.processInd = fn;

    return this;
};

/***********************************************************************/
/*** Private Methods                                                 ***/
/***********************************************************************/
Peripheral.prototype._wakeUp = function () {
    var self = this,
        deferred = Q.defer();

    if (this.status === 'online') 
        deferred.resolve();
    else 
        this.connect().done(function () {
            deferred.resolve();
        }, function (err) {
            if (err.message === 'Connect Timeout')
                self.status = 'offline';

            deferred.reject(err);
        });

    return deferred.promise;
};

Peripheral.prototype._score = function () {
    return ((this._indCount * 0.6) + (this._cmdCount * 0.4));
};

module.exports = Peripheral;
