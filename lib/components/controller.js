/* jshint node: true */
'use strict';

var util = require('util'),
    EventEmitter = require('events');

var bridge = require('./event_bridge');

function Controller (subModule, shepherd) {
    EventEmitter.call(this);

    this.subModule = subModule;
    this.drivers = null;

    this.getShepherd = function () {
        return shepherd;
    };

    if (this.subModule === 'cc-bnp') 
        this.drivers = require('../drivers/ccbnp_drivers');
    else if (this.subModule === 'noble')
        this.drivers = require('../drivers/noble_drivers');

    bridge.handleBnpEvts(this, subModule);
}

util.inherits(Controller, EventEmitter);

Controller.prototype.init = function (spCfg) {
    return this.drivers.init(spCfg);
};

Controller.prototype.close = function () {
    return this.drivers.close();
};

Controller.prototype.reset = function (mode) {
    return this.drivers.reset(mode);
};

Controller.prototype.scan = function () {
    var self = this;

    return this.drivers.scan().then(function (periphInfos) {
        if (self.subModule === 'cc-bnp') 
            self.emit('discover', periphInfos);
        return;
    });
};

Controller.prototype.cancelScan = function () {
    return this.drivers.cancelScan();
};

Controller.prototype.onDiscover = function (id, address, addressType, connectable, advertisement, rssi) {
    return this.drivers.onDiscover(id, address, addressType, connectable, advertisement, rssi);
};

Controller.prototype.setScanParams = function (setting) {
    return this.drivers.setScanParams(setting);
};

Controller.prototype.setLinkParams = function (setting) {
    return this.drivers.setLinkParams(setting);
};

Controller.prototype.setBondParam = function (paramId, value) {
    return this.drivers.setBondParam(paramId, value);
};

Controller.prototype.connect = function (periph) {
    return this.drivers.connect(periph);
};

Controller.prototype.connectCancel = function (periph) {
    return this.drivers.connectCancel(periph);
};

Controller.prototype.disconnect = function (periph) {
    return this.drivers.disconnect(periph);
};

Controller.prototype.updateLinkParam = function (periph, setting) {
    return this.drivers.updateLinkParam(periph, setting);
};

Controller.prototype.discAllServsAndChars = function (periph) {
    return this.drivers.discAllServsAndChars(periph);
};

Controller.prototype.passkeyUpdate = function (periph, passkey) {
    return this.drivers.passkeyUpdate(periph, passkey);
};

Controller.prototype.authenticate = function (periph, ioCap, mitm, bond) {
    return this.drivers.authenticate(periph, ioCap, mitm, bond);
};

Controller.prototype.terminateAuth = function (periph) {
    return this.drivers.terminateAuth(periph);
};

Controller.prototype.bond = function (periph, mitm, setting) {
    return this.drivers.bond(periph, mitm, setting);
};

Controller.prototype.read = function (char) {
    return this.drivers.read(char);
};

Controller.prototype.readDesc = function (char) {
    return this.drivers.readDesc(char);
};

Controller.prototype.write = function (char, value) {
    return this.drivers.write(char, value);
};

Controller.prototype.notify = function (char, config) {
    return this.drivers.notify(char, config);
};

Controller.prototype.indCfm = function (connHandle) {
    return this.drivers.indCfm(connHandle);
};

Controller.prototype.regChar = function (regObj, uuid) {
    return this.drivers.regChar(regObj, uuid);
};

Controller.prototype.regUuidHdlTable = function (periph) {
    return this.drivers.regUuidHdlTable(periph);
};

Controller.prototype.regPeriphInfo = function (periphInfo) {
    return this.drivers.regPeriphInfo(periphInfo);
};

module.exports = Controller;