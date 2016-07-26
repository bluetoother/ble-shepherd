/* jshint node: true */
'use strict';

var _ = require('busyman');

var bconfig = require('../config/config'),
    processor = require('./periph_processor'),
    loader = require('./loader');

var listeners = {},
    scanEmptyCount = 0;

listeners.attachEventListeners = function(shp) {
    var lsns = {};

    processor = processor(shp);
    loader = loader(shp);

    _.forEach(listeners, function (lsn, key) {
        if (key !== 'attachEventListeners')
            lsns[key] = lsn.bind(shp);
    });

    shp._controller.on('bnpReady', lsns.bnpReady);
    shp._controller.on('discover', lsns.discover);
    shp._controller.on('devOnline', lsns.devOnline);
    shp._controller.on('devOffline', lsns.devOffline);
    shp._controller.on('devRemoved', lsns.devRemoved);
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

            if (!self._blockerState ||
                (self._blockerState === 'white' &&  self.isWhiteListed(periph.addr)) ||
                (self._blockerState === 'black' && !self.isBlackListed(periph.addr))) {
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
                periph.status = 'online';
                processor.connPeriph(periph);
            }
        });

    if (this._enable === 'pending') return;

    nextScan = function () {
        if (self.getPermitJoinTime()) 
            self._controller.scan();
        else 
            applyScanRule(self);    // [TODO] scan for long interval
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
        periph = this.find(periphInfo.periphId),
        oldPeriph;

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

listeners.devOffline = function (periphInfo) {
    var periph = this.find(periphInfo.periphId);

    periph.connHdl = null;

    if (periph.status === 'online') {
        periph.status = 'offline';
        this.emit('IND', { type: 'DEV_LEAVING', data: periph.addr });
        console.log('Peripheral: ' + periph.addr + ' leave the network.');
    }
};

listeners.devRemoved = function (id) {
    this._periphBox.remove(id, function () {});
};

listeners.charNotif = function (charInfo) {
    var periph = this.find(charInfo.periphId),
        serv,
        servUuid,
        char,
        emitObj = {},
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

    emitObj.addr = periph.addr;
    emitObj.servUuid = char._service.uuid;
    emitObj.charUuid = char.uuid;
    emitObj.value = charInfo.value;
    this.emit('IND', { type: 'ATT_IND', data: emitObj });

    if (!_.isEqual(oldVal, charInfo.value)) {
        path = 'servs.' + servUuid + '.chars.' + char.hdl + '.val';
        this._periphBox.replace(periph._id, path, charInfo.value, function () {});
    }

    if (charInfo.type === 'attInd')
        this._controller.indCfm(periph.connHdl);
};

listeners.charChanged = function (charInfo) {
    var periph = this.find(charInfo.periphId),
        char = periph.findChar(charInfo.servUuid, charInfo.charUuid),
        path = '';

    if (!periph._id || periph.status !== 'online') 
        return;

    path = 'servs.' + charInfo.servUuid + '.chars.' + char.hdl + '.' + charInfo.type;

    this._periphBox.replace(periph._id, path, charInfo.value, function () {});
};

listeners.linkParamUpdate = function (linkParamInfo) {
    var periph = this.find(linkParamInfo.connHandle);

    delete linkParamInfo.periphId;
    periph.linkParams = linkParamInfo;
};

listeners.passkeyNeeded = function (data) {
    this.emit('IND', { type: 'PASSKEY_NEED', data: data });
};

listeners.attReq = function (data) {
    var self = this;
    
    this.bleCentral.processAttMsg(data).fail(function (err) {
        self.emit('IND', {type: 'LOCAL_SERV_ERR', data: {evtData: data, err: err}});
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