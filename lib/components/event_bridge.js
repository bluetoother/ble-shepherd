/* jshint node: true */
'use strict';

var blePacket = require('ble-char-packet');

var bridge = {};

bridge.handleBnpEvts = function (controller, subModule) {
    this.bnp = null;

    if (subModule === 'cc-bnp') {
        this.bnp = require('cc-bnp');
        this.handleCcbnpEvts(controller);
    } else if (subModule === 'noble') {
        this.bnp = require('noble');
        this.handleNobleEvts(controller);
    }
};

bridge.handleNobleEvts = function (controller) {
    var emitObj = {};

    this.bnp._bindings.on('connect', function (periphId, err) {
        if (err) return;
        emitObj.periphId = '0x' + periphId;
        controller.emit('devOnline', emitObj);
    });
    this.bnp._bindings.on('disconnect', function (periphId) {
        emitObj.periphId = '0x' + periphId;
        controller.emit('devOffline', emitObj);
    });
    this.bnp._bindings.on('read', function (periphId, serviceUuid, characteristicUuid, value, isNotification) {
        if (isNotification) {
            emitObj.type = 'attNoti';
            emitObj.periphId = '0x' + periphId;
            emitObj.servUuid = '0x' + serviceUuid;
            emitObj.charUuid = '0x' + characteristicUuid;

            blePacket.parse(emitObj.charUuid, value, function (err, result) {
                if (err) return;
                emitObj.value = result;
                controller.emit('charNotif', emitObj);
            });
        }
    });
    this.bnp.on('discover', function (periph) {

        var periphInfo = {
                addr: '0x' + periph.id,
                addrType: periph.addressType,
                connHdl: periph._noble._bindings._handles[periph.id],
                original: periph
            };
        controller.emit('discover', [periphInfo]);
    });
};

bridge.handleCcbnpEvts = function (controller) {
    var data,
        emitObj = {};

    this.bnp.on('ind', function (msg) {
        data = msg.data;
        switch (msg.type) {
            case 'linkEstablished':
                if (data.addr === '0x000000000000') break;
                emitObj.periphId = data.addr;
                emitObj.connHandle = data.connHandle;
                emitObj.linkParams = {
                    interval: data.connInterval,
                    latency: data.connLatency,
                    timeout: data.connTimeout
                };
                controller.emit('devOnline', emitObj);
                break;
            case 'linkTerminated':
                emitObj.periphId = data.connHandle;
                controller.emit('devOffline', emitObj);
                break;
            case 'linkParamUpdate':
                controller.emit('linkParamUpdate', data);
                break;
            case 'attNoti':
            case 'attInd':
                emitObj.type = msg.type;
                emitObj.periphId = data.connHandle;
                emitObj.charId = data.handle;
                emitObj.value = data.value;
                controller.emit('charNotif', emitObj);
                break;
            case 'passkeyNeeded':
                controller.emit('passkeyNeeded', data);
                break;
            case 'attReq':
                controller.emit('attReq', data);
                break;
            default:
                break;
        }
    });
};

module.exports = bridge;