var _ = require('lodash');

var blemgr = require('../lib/bleMgr'),
    servConstr = require('../lib/service/bleServConstr');
    spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

var charsInfo = [
    {uuid: '0xFFF1', permit: 1, prop: 2, desc: 'CHAR1', name: 'CHAR1', val: 20},
    {uuid: '0xFFF2', permit: 1, prop: 2, desc: 'CHAR2', name: 'CHAR2', val: 40},
	{uuid: '0xFFF3', permit: 3, prop: 8, desc: 'CHAR3', name: 'CHAR3', val: 60},
	{uuid: '0xFFF4', permit: 1, prop: 2, name: 'CHAR4', val: 80},
	{uuid: '0xFFF5', permit: 1, prop: 2, name: 'CHAR5', val: 100},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR6', val: 1},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR7', val: 2},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR8', val: 2},
    {uuid: '0x2902', permit: 1, prop: 2, name: 'CHAR9', val: 2},
];

var service = new servConstr('centralServ', '0xFFF0', charsInfo);

blemgr.preExec = preExec;
blemgr.start(spConfig, bleApp);

function bleApp () {
    blemgr.addLocalServ(service);

	// blemgr.devmgr.bleDevices[1].servs['0xfff0'].chars['0xfff4'].readDesc();
	setTimeout(function () {
		console.log(blemgr.devmgr.bleDevices[1]);
        // console.log(typeof blemgr.devmgr.bleDevices[1].servs['0x180a'].chars['0x2a23'].uuid);
        // console.log(blemgr.devmgr.bleDevices[1].servs['0x180a'].chars['0x2a23'].update());
        // console.log(blemgr.bleCentral.getAllAttrs());
	}, 3000);

	// setTimeout(function () {
	// 	console.log(blemgr.devmgr.bleDevices[2]);
	// }, 15000);
	
}

function preExec () {
    blemgr.regGattDefs('service', [{name: 'Test', uuid: '0xFFF0'}, {name: 'test2', uuid: '0xFFF1'}, {name: 'test3', uuid: '0xFFF3'}]);
}