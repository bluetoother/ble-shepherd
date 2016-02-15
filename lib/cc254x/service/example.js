var BleServ = require('./bleServConstr');

var pubCharsInfo = [
        // {uuid: '0x2a00', permit: ['Read'], prop: ['Read'], val: {name:"Simple BLE Central"}},
        {uuid: '0x2a01', permit: ['Read'], prop: ['Read'], val: {category:0}},
        {uuid: '0x2a02', permit: ['Read', 'Write'], prop: ['Read', 'Write'], val: {flag: 0}},
        {uuid: '0x2a04', permit: ['Read'], prop: ['Read'], val: {minConnInterval:80, maxConnInterval:160, latency:0, timeout:1000}},
    ],
    priCharsInfo = [
        {uuid: '0xfff1', permit: ['Read'], prop: ['Read'], desc: 'CHAR1', name: 'CHAR1', val: {val: 20}},
        {uuid: '0xfff2', permit: ['Read'], prop: ['Read'], desc: 'CHAR2', name: 'CHAR2', val: new Buffer([40])},
        {uuid: '0xfff3', permit: ['Read', 'Write'], prop: ['Write'], desc: 'CHAR3', name: 'CHAR3', val: new Buffer([60])},
        {uuid: '0xfff4', permit: ['Read'], prop: ['Read'], name: 'CHAR4', val: new Buffer([80])},
        {uuid: '0xfff5', permit: ['Read'], prop: ['Read'], name: 'CHAR5', val: new Buffer([100])},
    ],
    pubServInfo = {uuid: '0x1800', charsInfo: pubCharsInfo},
    priServInfo = {uuid: '0xfff0', charsInfo: priCharsInfo, name: 'centralServ'};

module.exports = {publicServ: pubServInfo, privateServ: priServInfo};