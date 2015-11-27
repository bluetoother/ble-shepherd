var BleServ = require('./bleServConstr');

var charsInfo = [
    {uuid: '0xfff1', permit: 1, prop: 2, desc: 'CHAR1', name: 'CHAR1', val: {val: 20}},
    {uuid: '0xfff2', permit: 1, prop: 2, desc: 'CHAR2', name: 'CHAR2', val: 40},
	{uuid: '0xfff3', permit: 3, prop: 8, desc: 'CHAR3', name: 'CHAR3', val: 60},
	{uuid: '0xfff4', permit: 1, prop: 2, name: 'CHAR4', val: 80},
	{uuid: '0xfff5', permit: 1, prop: 2, name: 'CHAR5', val: 100},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR6', val: 1},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR7', val: 2},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR8', val: 2},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR9', val: 2},
];

var service = new BleServ('0xFFF0', charsInfo, 'centralServ');

module.exports = service;