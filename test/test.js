var _ = require('lodash');

var bShepherd = require('../lib/ble-shepherd'),
    servConstr = require('../lib/service/bleServConstr'),
    exampleServ = require('../lib/service/example'),
    pubServ = exampleServ.publicServ,
    priServ = exampleServ.privateServ,
    spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

var peri,
    keyFob;

bShepherd.preExec = preExec;
bShepherd.start(spConfig, bleApp);

function preExec () {
    bShepherd.regGattDefs('service', [
        {name: 'Test', uuid: '0xFFF0'}, 
        {name: 'SimpleKeys', uuid: '0xffe0'}, 
        {name: 'Accelerometer', uuid: '0xffa0'}]);

    bShepherd.regGattDefs('characteristic', [
        {name: 'KeyPressState', uuid: '0xffe1', params: ['Enable'], types: ['uint8']}, 
        {name: 'Enable', uuid: '0xffa1'}, 
        {name: 'AccelerometerX', uuid: '0xffa3'},
        {name: 'AccelerometerY', uuid: '0xffa4'}, 
        {name: 'AccelerometerZ', uuid: '0xffa5'}, 
        {name: 'FFF3', uuid: '0xfff3', params: ['val'], types: ['uint8']},
        {name: 'FFF1', uuid: '0xfff1', params: ['val'], types: ['uint8']}]);
}

function bleApp () {
    var keyFob = bShepherd.devmgr.findDev('0x544a165e1f53');

    bShepherd.addLocalServ(pubServ).then(function () {
        return bShepherd.addLocalServ(priServ);
    }).done();

    setTimeout(function () {
        bShepherd.devmgr.stopScan();
    }, 5000);

	bShepherd.on('IND', function(msg) {
        switch (msg.type) {
            case 'DEV_INCOMING':
                devIncomingHdlr(msg.data);
                break;
            case 'DEV_LEAVING':
                break;
            case 'ATT_IND':
                break;
            case 'PASSKEY_NEED':
                break;
            case 'LOCAL_SERV_ERR':
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

function devIncomingHdlr(addr) {
    if (addr === '0x78c5e570796e') {
        peri = bShepherd.devmgr.findDev('0x78c5e570796e');

    } else if (addr === '0x544a165e1f53') {
        keyFob = bShepherd.devmgr.findDev('0x544a165e1f53');
        keyFob.servs['0xffe0'].chars['0xffe1'].processInd = processKeyFobInd;
        keyFob.servs['0xffe0'].chars['0xffe1'].setConfig(true);
    }
}



