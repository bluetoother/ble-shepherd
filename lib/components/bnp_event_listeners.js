/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Q = require('q'),
    debugInit = require('debug')('ble-shepherd:init'),
    debug = require('debug')('ble-shepherd:evtLsns');

var bconfig = require('../config/config'),
    periphLoader = require('./loader'),
    butil = require('./bleutil');

var processor,
    loader,
    listeners = {},
    scanEmptyCount = 0;

listeners.attachEventListeners = function(shp) {
    var lsns = {};

    processor = shp._periphProcessor;
    loader = periphLoader(shp);

    _.forEach(listeners, function (lsn, key) {
        if (key !== 'attachEventListeners')
            lsns[key] = lsn.bind(shp);
    });

    shp._controller.on('bnpReady', lsns.bnpReady);
    shp._controller.on('discover', lsns.discover);
    shp._controller.on('devOnline', lsns.devOnline);
    shp._controller.on('devOffline', lsns.devOffline);
    shp._controller.on('linkParamUpdate', lsns.linkParamUpdate);
    shp._controller.on('charNotif', lsns.charNotif);
    shp._controller.on('charChanged', lsns.charChanged);
    shp._controller.on('passkeyNeeded', lsns.passkeyNeeded);
    shp._controller.on('attReq', lsns.attReq);
};

listeners.bnpReady = function () {
    var self = this,
        linkParams;

    debugInit('BLE Central init done! Wait for BLE network establishment');
    debugInit('Central address: %s', this.bleCentral.addr);

    if (this._subModule !== 'noble')
        linkParams = bconfig.ccbnplinkParams;
    else
        linkParams = bconfig.noblelinkParams;

    debugInit('BLE establishing stage 1: setting network parameters');

    this._controller.setLinkParams(linkParams).then(function () {
        return self._controller.setScanParams(bconfig.scanParams);
    }).then(function () {
        debugInit('BLE establishing stage 2: loading peripherals from database.');

        return loader.reloadPeriphs();
    }).then(function (num) {
        debugInit('BLE establishing stage 3: asynchrnously connect devices in database.');

        if (num !== 0) 
            return self._collectReloadPeriphs(num);
    }).then(function (rPeriphs) {
        debugInit('BLE network establishing done!');

        self.emit('ready');
        self._controller.scan();

        if (_.size(rPeriphs) !== 0)
            _.forEach(rPeriphs, function (periph) {
                self.emit('ind', { type: 'devStatus', periph: periph, data: periph.status });

                if (periph.status === 'online')
                    debug('peripheral ' + periph.addr + ' online.');
            });
    }).fail(function (err) {
        self.emit('error', err);
    }).done();
};

listeners.discover = function (periphInfos) {
    var self = this,
        blocker = this.blocker,
        periph,
        connFlag = false,
        nextScan,
        newPeriphInfos = [],
        allowDev, 
        allowDevFns = [];

    if (this._resetting) return;

    _.forEach(periphInfos, function (periphInfo, index) {
        debug('peripheral ' + periphInfo.addr + ' discovered');

        if (self._subModule === 'noble') 
            periphInfo.advertisement = periphInfo.original.advertisement;
        else 
            periphInfo.advertisement = periphInfo.advertisement || {};

        allowDev = Q.nbind(self.acceptDevIncoming, self);
        allowDevFns.push(allowDev(periphInfo));

    });

    Q.all(allowDevFns).then(function (result) {
        _.forEach(result, function (checked) {
            var pInfo = checked.periphInfo;
            if (checked.accepted) 
                newPeriphInfos.push(pInfo);
            else if (_.isEmpty(pInfo.advertisement)) 
                self._controller.emit('connectErr');
        });

        if (self._enable !== true || self.getPermitJoinTime()) 
            _.forEach(newPeriphInfos, function (periphInfo) {
                periph = processor.newPeriph(periphInfo);

                if (periph.status === 'idle' || periph.status === 'online') 
                    return;

                if (!blocker.isEnabled() ||
                    (blocker.getType() === 'white' &&  blocker.isWhitelisted(periph.addr)) ||
                    (blocker.getType() === 'black' && !blocker.isBlacklisted(periph.addr))) {
                    if (_.isNil(periph._id))
                        self.regPeriph(periph);

                    connFlag = true;
                    periph.connect();
                }
            });
        else 
            _.forEach(newPeriphInfos, function (periphInfo) {
                periph = self.find(periphInfo.addr);

                if (periph && periph.status === 'offline') {
                    connFlag = true;
                    periph.connect();
                }
            });

        if (self._enable === 'pending') return;

        nextScan = function () {
            if (self.getPermitJoinTime()) 
                self._controller.scan();
            else 
                applyScanRule(self);   
        };

        if (connFlag) {
            scanEmptyCount = 0;
            self._controller.once('allConnected', function () {
                nextScan();
            });
        } else {
            scanEmptyCount += 1;
            nextScan();
        }
    }).fail(function (err) {
        self.emit('error', err);
    }).done();
};

listeners.devOnline = function (periphInfo) { // sync to the remote periph
    var self = this,
        periph = this.find(periphInfo.periphId);

    if (!_.isNil(periphInfo.linkParams)) 
        periph.linkParams = periphInfo.linkParams;
    if (!_.isNil(periphInfo.connHandle)) 
        periph.connHandle = periphInfo.connHandle;
    if (!_.isNil(periph._original))
        periph.connHandle = periph._original._noble._bindings._handles[periph._original.id];

    periph.joinTime = Math.floor(Date.now()/1000);

    if (self._enable !== 'pending' && periph.status !== 'disc') {
        this.emit('ind', { type: 'devStatus', periph: periph, data: 'online' });
        debug('peripheral ' + periph.addr + ' online.');
    }

    processor.syncPeriph(periph).done(function () {
        var oldStatus = periph.status;

        periph.status = 'online';
        periph = self._examinePeriph(periph);
        self._controller.regUuidHdlTable(periph);
        self._periphBox.sync(periph._id, function () {
            if (self._enable === 'pending') {
                self.emit('_devStatus', { periph: periph });
            } else if (oldStatus === 'disc') {
                self.emit('ind', { type: 'devIncoming', periph: periph });
                self.emit('ind', { type: 'devStatus', periph: periph, data: 'online' });
                debug('peripheral ' + periph.addr + ' online.');
            }
        });
    }, function (err) {
        periph.disconnect();
        self.emit('error', err);
    });
};

listeners.devOffline = function (periphInfo) {
    var periph = this.find(periphInfo.periphId);

    periph.connHandle = null;
    periph.joinTime = null;

    if (periph.status === 'online') {
        debug('peripheral ' + periph.addr + ' offline.');

        periph.status = 'offline';
        this.emit('ind', { type: 'devStatus', periph: periph, data: periph.status });
    } else if (periph.status === 'idle') {
        debug('peripheral ' + periph.addr + ' idle.');
    }
};

listeners.charNotif = function (charInfo) {
    var self = this,
        periph = this.find(charInfo.periphId),
        char,
        oldVal,
        path = '',
        emitObj = {
            type: 'attNotify',
            periph: periph,
            data: {}
        };

    if(!periph) return;

    periph._indCount += 1;

    _.forEach(periph.servs, function (serv) {
        if (charInfo.charId > serv.startHandle && charInfo.charId < serv.endHandle)
            char = periph.findChar(serv.uuid, charInfo.charId);
    });

    oldVal = char.value;
    char.value = charInfo.value;
    char.processInd(charInfo.value);

    emitObj.data.sid = {
        uuid: char._service.uuid,
        handle: char._service.handle
    };
    emitObj.data.cid = {
        uuid: char.uuid,
        handle: char.handle
    };
    emitObj.data.value = charInfo.value;

    this.emit('ind', emitObj);

    if (charInfo.type === 'attInd')
        this._controller.indCfm(periph.connHandle);

    if (!_.isEqual(oldVal, charInfo.value)) {
        emitObj.data.periph = periph;
        emitObj.data.type = 'value';

        if (_.isPlainObject(oldVal))
            emitObj.data.diff = butil.objectDiff(oldVal, charInfo.value);
        else if (_.isBuffer(oldVal) || _.isNull(oldVal))
            emitObj.data.diff = charInfo.value;

        listeners.charChanged.call(self, emitObj.data);
    }
};

listeners.charChanged = function (charInfo) {
    var self = this,
        periph = charInfo.periph,
        char = periph.findChar(charInfo.sid.handle, charInfo.cid.handle),
        path = '',
        emitObj = {
            type: 'attChange',
            periph: periph,
            data: {}
        };

    if (!periph._id || periph.status !== 'online') 
        return;

    path = 'servList.' + char._service._index + '.charList.' + char._index + '.' + charInfo.type;

    this._periphBox.replace(periph._id, path, charInfo.value, function (err) {
        if (err) {
            self.emit('error', err);
        } else if (charInfo.type === 'value') {
            emitObj.data.sid = charInfo.sid;
            emitObj.data.cid = charInfo.cid;
            emitObj.data.value = charInfo.diff;
            self.emit('ind', emitObj);
        }
    });
};

listeners.linkParamUpdate = function (linkParamInfo) {
    var periph = this.find(linkParamInfo.connHandle);

    if (!periph) return;

    delete linkParamInfo.connHandle;
    periph.linkParams = linkParamInfo;
};

listeners.passkeyNeeded = function (data) {
    var periph = this.find(data.devAddr);

    this.emit('ind', { type: 'devNeedPasskey', periph: periph, data: data });
};

listeners.attReq = function (data) {
    var self = this;
    
    this.bleCentral.processAttMsg(data).fail(function (err) {
        self.emit('ind', {type: 'LOCAL_SERV_ERR', data: {evtData: data, err: err}});
    }).done();
};

function applyScanRule (shepherd) {
    var interval = 3000;

    if (!_.isFunction(shepherd.setScanRule)) 
        return;

    interval = shepherd.setScanRule(scanEmptyCount) || interval;
    setTimeout(function () {
        shepherd._controller.scan();
    }, interval);
}

module.exports = listeners;