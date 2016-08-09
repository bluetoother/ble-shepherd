/* jshint node: true */
'use strict';

var _ = require('busyman');

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

    console.log('>> Central has completed initialization');

    if (this._subModule !== 'noble')
        linkParams = bconfig.ccbnplinkParams;
    else
        linkParams = bconfig.noblelinkParams;

    if (this._enable === 'pending') 
        this.init();

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
        self.emit('ready');
        self._controller.scan();
        if (rPeriphs) {
            _.forEach(rPeriphs.online, function (periph) {
                self.emit('ind', { type: 'devIncoming', periph: periph });
            });
            _.forEach(rPeriphs.idle, function (periph) {
                self.emit('ind', { type: 'devStatus', periph: periph, data: periph.status });
            });
        }
    }).fail(function (err) {
        console.log('Problem occurs when starting central');
        console.log(err);
    }).done();
};

listeners.discover = function (periphInfos) {
    var self = this,
        periph,
        connFlag = false,
        nextScan;

    if (this._resetting) return;

    if (this._enable !== true || this.getPermitJoinTime()) {
        _.forEach(periphInfos, function (periphInfo) {
            periph = processor.newPeriph(periphInfo);

            if (periph.status === 'idle') 
                return;

            if (!self.blocker.isEnabled() ||
                (self.blocker.getType() === 'white' &&  self.blocker.isWhitelisted(periph.addr)) ||
                (self.blocker.getType() === 'black' && !self.blocker.isBlacklisted(periph.addr))) {
                if (_.isNil(periph._id))
                    self.regPeriph(periph);
                connFlag = true;
                processor.connPeriph(periph);
            }
        });
    } else 
        _.forEach(periphInfos, function (periphInfo) {
            periph = self.find(periphInfo.addr);

            if (periph && periph.status === 'offline') {
                connFlag = true;
                processor.connPeriph(periph);
            }
        });

    if (this._enable === 'pending') return;

    nextScan = function () {
        if (self.getPermitJoinTime()) 
            self._controller.scan();
        else 
            applyScanRule(self);   
    };

    if (connFlag) {
        scanEmptyCount = 0;
        this._controller.once('allConnected', function () {
            nextScan();
        });
    } else {
        scanEmptyCount += 1;
        nextScan();
    }
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
    this.emit('ind', { type: 'devStatus', periph: periph, data: 'online' });

    processor.syncPeriph(periph).done(function () {
        periph.status = 'online';
        periph = self._examinePeriph(periph);
        self._periphBox.update(periph._id, function () {});
        self.emit('ind', { type: 'devIncoming', periph: periph });
        console.log('Device: ' + periph.addr + ' join the network.');
    }/*, function (err) {
        periph.disconnect();
        console.log('Peripheral: ' + periph.addr + ' synchronize failure with error: ' + err +'.');
    }*/);
};

listeners.devOffline = function (periphInfo) {
    var periph = this.find(periphInfo.periphId);

    periph.connHandle = null;
    periph.joinTime = null;

    if (periph.status === 'online') {
        periph.status = 'offline';
        this.emit('ind', { type: 'devStatus', periph: periph, data: periph.status });
        console.log('Peripheral: ' + periph.addr + ' leave the network.');
    }
};

listeners.charNotif = function (charInfo) {
    var self = this,
        periph = this.find(charInfo.periphId),
        char,
        emitObj = {},
        oldVal,
        path = '';

    periph._indCount += 1;

    if (!_.isNil(charInfo.servUuid)) 
        char = periph.findChar(charInfo.servUuid, charInfo.charUuid);
    else 
        _.forEach(periph.servs, function (serv) {
            if (charInfo.charId > serv.startHandle && charInfo.charId < serv.endHandle)
                char = periph.findChar(serv.uuid, charInfo.charId);
        });

    oldVal = char.value;
    char.value = charInfo.value;
    char.processInd(charInfo.value);

    emitObj.sid = {
        uuid: char._service.uuid,
        handle: char._service.handle
    };
    emitObj.cid = {
        uuid: char.uuid,
        handle: char.handle
    };
    emitObj.value = charInfo.value;

    this.emit('ind', { type: 'attNotify', periph: periph, data: emitObj });

    if (charInfo.type === 'attInd')
        this._controller.indCfm(periph.connHandle);

    if (!_.isEqual(oldVal, charInfo.value)) {
        emitObj.periph = periph;
        emitObj.type = 'value';

        if (_.isPlainObject(oldVal))
            emitObj.diff = butil.objectDiff(oldVal, charInfo.value);
        else if (_.isBuffer(oldVal) || _.isNull(oldVal))
            emitObj.diff = charInfo.value;

        listeners.charChanged.call(self, emitObj);
    }
};

listeners.charChanged = function (charInfo) {
    var self = this,
        periph = charInfo.periph,
        char = periph.findChar(charInfo.sid.handle, charInfo.cid.handle),
        path = '',
        emitObj = {};

    if (!periph._id || periph.status !== 'online') 
        return;

    path = 'servList.' + char._service._index + '.charList.' + char._index + '.' + charInfo.type;

    this._periphBox.replace(periph._id, path, charInfo.value, function (err) {
        if (err) {
            // [TODO], error handling
        } else if (charInfo.type === 'value') {
            emitObj.sid = charInfo.sid;
            emitObj.cid = charInfo.cid;
            emitObj.value = charInfo.diff;
            self.emit('ind', { type: 'attChange', periph: periph, data: emitObj });
        }
    });
};

listeners.linkParamUpdate = function (linkParamInfo) {
    var periph = this.find(linkParamInfo.connHandle);

    delete linkParamInfo.connHandle;
    periph.linkParams = linkParamInfo;
};

listeners.passkeyNeeded = function (data) {
    this.emit('ind', { type: 'devNeedPasskey', data: data });
};

listeners.attReq = function (data) {
    var self = this;
    
    this.bleCentral.processAttMsg(data).fail(function (err) {
        self.emit('ind', {type: 'LOCAL_SERV_ERR', data: {evtData: data, err: err}});
    }).done();
};

function applyScanRule (shepherd) {
    var interval = 3000;

    if (!_.isFunction(shepherd.setScanRule)) {
        return;
    }

    interval = shepherd.setScanRule(scanEmptyCount) || interval;
    setTimeout(function () {
        shepherd._controller.scan();
    }, interval);
}

module.exports = listeners;