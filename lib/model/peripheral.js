/* jshint node: true */
'use strict';

var Q = require('q'),
    _ = require('busyman'),
    debug = require('debug')('ble-shepherd:peripheral'),
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
    this.connHandle = !_.isNil(periphInfo.connHandle) ? periphInfo.connHandle : null;
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

    if (!_.isNil(this.connHandle)) {
        this.status = 'online';
        deferred.resolve();
    } else {
        periphOnlineHdlr = function (msg) {
            if (msg.type === 'devIncoming' && msg.periph.addr === self.addr) {
                debug('Peripheral: ' + self.addr + ' join the network.');

                controller.removeListener('connectErr', errHdlr);
                shepherd.removeListener('ind', periphOnlineHdlr);
                deferred.resolve();
            }
        };
        errHdlr = function (msg) {
            if (msg.addr === self.addr) {
                controller.removeListener('connectErr', errHdlr);
                shepherd.removeListener('ind', periphOnlineHdlr);
                deferred.reject(msg.err);
            }
        };

        controller.on('connectErr', errHdlr);
        shepherd.on('ind', periphOnlineHdlr);

        shepherd._periphProcessor.connPeriph(this);
    }

    return deferred.promise.nodeify(callback);
};

Peripheral.prototype.disconnect = function (callback) {
    var deferred = Q.defer();

    if (_.isNil(this.connHandle)) {
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

Peripheral.prototype.maintain = function (callback) {
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

    if (_.isNil(this.connHandle) && this.status === 'offline') 
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

Peripheral.prototype.tuneLink = function (setting, callback) {
    var self = this;

    if (!_.isPlainObject(setting)) 
        throw new TypeError('setting must be an object.');

    setting.interval = setting.interval || 0x0018;
    setting.latency = setting.latency || 0x0000;
    setting.timeout = setting.timeout || 0x00c8;

    return this._wakeUp().then(function () {
        return self._controller.updateLinkParam(self, setting);
    }).then(function () {
        self._cmdCount += 1;
        self.linkParams = setting;
    }).nodeify(callback);
};

Peripheral.prototype.secure = function (setting, callback) {
    var self = this;

    if (this._controller.subModule === 'noble') 
        throw new Error('This command not supported with submodule noble.');

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

    return this._wakeUp().then(function () {
        return self._secMdl.init();
    }).then(function () {
        return self._secMdl.pairing();
    }).then(function (result) {
        self._secMdl.state = 'encrypted';
        if (self._secMdl.bond) 
            return self._secMdl.bonding(); 
        else 
            return;
    }).then(function () {
        self._cmdCount += 1;
    }).nodeify(callback);
};

Peripheral.prototype.returnPasskey = function (passkey, callback) {
    var self = this;

    if (this._controller.subModule === 'noble') 
        throw new Error('This command not supported with submodule noble.');

    if (!_.isString(passkey) || _.size(passkey) !== 6 || _.isNaN(_.parseInt(passkey)))
        throw new TypeError('Passkey must be a string of length 6.');

    return this._wakeUp().then(function () {
        return self._secMdl.returnPasskey(passkey);
    }).then(function () {
        self._cmdCount += 1;
    }).nodeify(callback);
};

Peripheral.prototype.dump = function (sid, cid) {
    var serv,
        char,
        servList,
        result = {},
        index = 0;

    if (sid) {
        if (cid)
            return this.findChar(sid, cid).dump();
        else
            return this.findServ(sid).dump();
    } else {
        servList = _.map(this.servs, function (serv, i) {
            serv._index = index;
            index += 1;
            return serv.dump();
        });

        return {
            addr: this.addr,
            addrType: this.addrType,
            servList: servList
        };
    }
};

Peripheral.prototype.attatchServs = function (servInfos) {
    var self = this;

    _.forEach(servInfos, function (servInfo) {
        var serv = new Service(servInfo, self);

        self.servs[serv.handle] = serv;
    });
};

Peripheral.prototype.findServ = function (sid) {
    if (_.isNumber(sid))
        return this.servs[sid];
    else if (_.isString(sid) && _.startsWith(sid, '0x'))
        return _.find(this.servs, function (serv) {
            return butil.shrinkUuid(serv.uuid) === butil.shrinkUuid(sid);
        });
    else 
        throw new TypeError('sid must be a string and start with 0x');
};

Peripheral.prototype.findChar = function (sid, cid) {
    var serv = this.findServ(sid);

    if (serv) {
        if (_.isNumber(cid)) 
            return serv.chars[cid];
        else if (_.isString(cid) && _.startsWith(cid, '0x')) 
            return _.find(serv.chars, function (char) {
                return butil.shrinkUuid(char.uuid) === butil.shrinkUuid(cid);
            });
        else 
            throw new TypeError('cid must be a number or a string start with 0x');
    } else {
        return;
    }
};

Peripheral.prototype.read = function (sid, cid, callback) {
    var self = this,
        char;

    char = self.findChar(sid, cid);

    return this._wakeUp().then(function () {
        char = self.findChar(sid, cid);

        if (!char) 
            throw new Error('Can not find characteristic.');
        else
            return char.read();
    }).then(function (result) {
        self._cmdCount += 1;
        return result;
    }).nodeify(callback);
};

Peripheral.prototype.readDesc = function (sid, cid, callback) {
    var self = this,
        char;

    char = self.findChar(sid, cid);

    return this._wakeUp().then(function () {
        char = self.findChar(sid, cid);

        if (!char) 
            throw new Error('Can not find characteristic.');
        else
            return char.readDesc();
    }).then(function (result) {
        self._cmdCount += 1;
        return result;
    }).nodeify(callback);
};

Peripheral.prototype.write = function (sid, cid, value, callback) {
    var self = this,
        char;

    char = self.findChar(sid, cid);

    if (_.isNil(value) || (!_.isPlainObject(value) && !Buffer.isBuffer(value))) 
        throw new TypeError('value must be an object or a buffer');

    return this._wakeUp().then(function () {
        char = self.findChar(sid, cid);

        if (!char) 
            throw new Error('Can not find characteristic.');
        else
            return char.write(value);
    }).then(function (result) {
        self._cmdCount += 1;
    }).nodeify(callback);
};

Peripheral.prototype.configNotify = function (sid, cid, config, callback) {
    var self = this,
        char;

    char = self.findChar(sid, cid);

    if (!_.isBoolean(config)) 
        throw new TypeError('config must be a boolean');

    return this._wakeUp().then(function () {
        char = self.findChar(sid, cid);

        if (!char) 
            throw new Error('Can not find characteristic.');
        else
            return char.notify(config);
    }).then(function (result) {
        self._cmdCount += 1;
    }).nodeify(callback);
};

Peripheral.prototype.onNotified = function (sid, cid, fn) {
    var char = this.findChar(sid, cid);

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
    else if (this.status === 'offline')
        deferred.reject(new Error('Peripheral is not online.'));
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
