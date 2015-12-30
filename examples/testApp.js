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

bShepherd.appInit = appInit;
bShepherd.start(spConfig, bleApp);

function appInit () {
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
    bShepherd.setScanRule = function (times) {
        var interval;

        if (_.isUndefined(times)) {
            interval = 5000;
        } else {
            if (times <= 5) {
                interval = 10000;
            } else if (times <= 10) {
                interval = 30000;
            } else if (times > 10) {
                interval = 60000;
            }
        } 
        return interval;
    };

    bShepherd.addLocalServ(pubServ, function (err) {
        if (!err) {
            bShepherd.addLocalServ(priServ);
        }
    });

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

    setTimeout(function () {
        bShepherd.permitJoin(false);
    }, 20000);
}

function devIncomingHdlr(addr) {
    if (addr === '0x78c5e570796e') {
        peri = bShepherd.find('0x78c5e570796e');        
    } else if (addr === '0x544a165e1f53') {
        keyFob = bShepherd.find('0x544a165e1f53');

        keyFob.regCharHdlr('0xffe0', '0xffe1', processKeyFobInd);
        keyFob.setNotify('0xffe0', '0xffe1', true);
    }
}

function processKeyFobInd (data) {
    if (data.Enable === 1) {
        console.log('Left button press.');
    } else if (data.Enable === 2) {
        console.log('Right button press.');
    }
}

