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
    this.connHdl = periphInfo.connHdl ? periphInfo.connHdl : null;
    this.linkParams  = null;
    this.servs = {};
    this.sm = null;
    this.name = null;
}

Peripheral.prototype.connect = function (callback) { 
    var self = this,
        deferred = Q.defer(),
        timeout;

    if (!_.isNil(this.connHdl)) {
        this.status = 'online';
        deferred.resolve();
    } else {
        timeout = setTimeout(function () {
            self._controller.connectCancel(self);
        }, 1000); //[TODO]
        
        this._controller.connect(this).done(function (addr) {
            if (addr === '0x000000000000')
                deferred.reject(new Error('connect timeout'));
            else {
                clearTimeout(timeout);
                deferred.resolve();
            }
            
        }, function (err) {
            deferred.reject(err);
        });
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
        this._controller.emit('devRemoved', this._id);
        deferred.resolve();
    } else { 
        this._controller.disconnect(this).then(function () {
            self._controller.emit('devRemoved', self._id);
            deferred.resolve();
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

    if (_.isNil(this.connHdl)) 
        deferred.reject(new Error('Peripheral is not online.'));
        // deferred.reject(new Error('Peripheral is idle.'));//[TODO]
    else
        butil.seqResolveQFuncs(updateChars).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.updateLinkParam = function (interval, latency, timeout, callback) {
    var deferred = Q.defer(),
        setting = {};

    if (!_.isNumber(interval) || !_.isNumber(latency) || !_.isNumber(timeout)) 
        throw new Error('interval, latency and timeout must be number.');
    
    setting.interval = interval;
    setting.latency = latency;
    setting.timeout= timeout;

    if (this.status === 'idle' || this.status === 'offline') {
        deferred.reject(new Error('Device is not online.'));
    } else {
        this._controller.updateLinkParam(this, setting).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

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
            if (this._secMdl[key]) 
                this._secMdl[key] = val;
        });
    }

    if (this._controller.subModule === 'noble') 
        deferred.reject(new Error('This command not supported with submodule noble.'));
    else if (this.state === 'idle' || this.state === 'offline')  // [TODO]
        deferred.reject(new Error('Device is not online.'));
    else {
        this._secMdl.init().then(function () {
            return self._secMdl.pairing();
        }).then(function (result) {
            self._secMdl.state = 'encrypted';
            if (self._secMdl.bond === 1) { 
                return self._secMdl.bonding(); 
            } else {
                return;
            }
        }).then(function () {
            deferred.resolve();
        }).fail(function(err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.passPasskey = function (passkey, callback) {
    var deferred = Q.defer();

    if (this._controller.subModule === 'noble') 
        deferred.reject(new Error('This command not supported with submodule noble.'));
    else if (this.state === 'idle' || this.state === 'offline')  //[TODO]
        deferred.reject(new Error('Device is not online.'));
    else { 
        this._secMdl.passPasskey(passkey).done(function () {
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

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

    if (uuidServ.length ===  34) 
        uuidServ = '0x' + uuidServ.slice(6, 10);

    uuidServ = uuidServ.toLowerCase();

    return this.servs[uuidServ];
};

Peripheral.prototype.findChar = function (uuidServ, uuidChar) {
    var serv = this.findServ(uuidServ);

    if (serv) {
        if (_.isNumber(uuidChar)) 
            return serv.chars[uuidChar];
        else if(_.isString(uuidChar) && _.startsWith(uuidChar, '0x')) 
            return _.find(serv.chars, function (char) {
                return char.uuid === uuidChar;
            });
        else {
            throw new Error('uuidChar must be a number or a string start with 0x');
        }
    } else {
        return;
    }
};

Peripheral.prototype.read = function (uuidServ, uuidChar, callback) {
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) 
        deferred.reject(checkErr);
    else if (!char) 
        deferred.reject(new Error('Can not find characteristic.'));
    else if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else if (this.status === 'idle')
        deferred.reject(new Error('Device is idle.')); //TODO
    else 
        char.read().done(function (result) {
            deferred.resolve(result);
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.readDesc = function (uuidServ, uuidChar, callback) {
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) 
        deferred.reject(checkErr);
    else if (!char) 
        deferred.reject(new Error('Can not find characteristic.'));
    else if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else if (this.status === 'idle')
        deferred.reject(new Error('Device is idle.')); //TODO
    else 
        char.readDesc().done(function (result) {
            deferred.resolve(result);
        }, function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.write = function (uuidServ, uuidChar, value, callback) {
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) 
        deferred.reject(checkErr);
    else if (!char) 
        deferred.reject(new Error('Can not find characteristic.'));
    else if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else if (this.status === 'idle')
        deferred.reject(new Error('Device is idle.')); //TODO
    else 
        char.write(value).done(function () {
            deferred.resolve();
        },function (err) {
            deferred.reject(err);
        });
    

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.setNotify = function (uuidServ, uuidChar, config, callback) {
    var deferred = Q.defer(),
        char,
        checkErr;

    try {
        char = this.findChar(uuidServ, uuidChar);
    } catch (e) {
        checkErr = e;
    }

    if (checkErr) 
        deferred.reject(checkErr);
    else if (!char) 
        deferred.reject(new Error('Can not find characteristic.'));
    else if (this.status === 'offline') 
        deferred.reject(new Error('Device is not online.'));
    else if (this.status === 'idle')
        deferred.reject(new Error('Device is idle.')); //TODO
    else 
        char.notify(config).done(function () {
            deferred.resolve();
        },function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.regCharHdlr = function (uuidServ, uuidChar, fn) {
    var char = this.findChar(uuidServ, uuidChar);

    if (!_.isFunction(fn)) { throw new TypeError('fn must be a function'); }
    
    if (char) {
        char.processInd = fn;
    }

    return this;
};

module.exports = Peripheral;
