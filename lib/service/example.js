var BleServ = require('./bleServConstr');

var pubCharsInfo = [
        {uuid: '0x2a00', permit: 1, prop: 2, val: {DeviceName:"Simple BLE Central"}},
        {uuid: '0x2a01', permit: 1, prop: 2, val: {Appearance:0}},
        {uuid: '0x2a02', permit: 3, prop: 10, val: {PeripheralPrivacyFlag: 0}},
        {uuid: '0x2a04', permit: 1, prop: 2, val: {MinConnInterval:80, MaxConnInterval:160, Latency:0, Timeout:1000}},
    ],
    priCharsInfo = [
        {uuid: '0xfff1', permit: 1, prop: 2, desc: 'CHAR1', name: 'CHAR1', val: {val: 20}},
        {uuid: '0xfff2', permit: 1, prop: 2, desc: 'CHAR2', name: 'CHAR2', val: 40},
        {uuid: '0xfff3', permit: 3, prop: 8, desc: 'CHAR3', name: 'CHAR3', val: 60},
        {uuid: '0xfff4', permit: 1, prop: 2, name: 'CHAR4', val: 80},
        {uuid: '0xfff5', permit: 1, prop: 2, name: 'CHAR5', val: 100},
    ],
    pubServ = new BleServ('0x1800', pubCharsInfo),
    priServ = new BleServ('0xfff0', priCharsInfo, 'centralServ');

module.exports = {publicServ: pubServ, privateServ: priServ};