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

function preExec () {
    blemgr.regGattDefs('service', [{name: 'Test', uuid: '0xFFF0'}, {name: 'SimpleKeys', uuid: '0xffe0'}, {name: 'Accelerometer', uuid: '0xffa0'}]);
    blemgr.regGattDefs('characteristic', [{name: 'KeyPressState', uuid: '0xffe1', params: ['Enable'], types: ['uint8']}, {name: 'Enable', uuid: '0xffa1'}, {name: 'AccelerometerX', uuid: '0xffa3'},
        {name: 'AccelerometerY', uuid: '0xffa4'}, {name: 'AccelerometerZ', uuid: '0xffa5'}]);
}

function bleApp () {
    var keyFob = blemgr.devmgr.findDev('0x544a165e1f53');

    blemgr.addLocalServ(service);
    keyFob.servs['0xffe0'].chars['0xffe1'].processInd = processKeyFobInd;
    keyFob.servs['0xffe0'].chars['0xffe1'].setConfig(true).then(function (result) {
        console.log(result);
    }).fail(function (err) {
        console.log(err);
    });

    // setTimeout(function () {
    //     var keyFob = blemgr.devmgr.findDev('0x544a165e1f53');
    //     _.forEach(keyFob.servs, function (serv) {
    //         console.log(serv);
    //     });
    // }, 30000);

	blemgr.on('ind', function(msg) {
        switch (msg.type) {
            case 'DEV_INCOMING':
                break;
            case 'DEV_LEAVING':
                break;
            case 'ATT_IND':
                break;
            case 'PASSKEY_NEED':
                break;
        }
    });
}

function processKeyFobInd (data) {
    if (data.Enable === 1) {
        console.log('Left button press.');
    } else if (data.Enable === 2) {
        console.log('Right button press.');
    }
}



