var _ = require('lodash');

var bShepherd = require('../lib/ble-shepherd'),
    exampleServ = require('../lib/service/example'),
    spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

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
    // var keyFob = bShepherd.devmgr.findDev('0x544a165e1f53');

    bShepherd.addLocalServ(exampleServ);
    // keyFob.servs['0xffe0'].chars['0xffe1'].processInd = processKeyFobInd;
    // keyFob.servs['0xffe0'].chars['0xffe1'].setConfig(true).then(function (result) {
    //     console.log(result);
    // }).fail(function (err) {
    //     console.log(err);
    // });

    // setTimeout(function () {
    //     var keyFob = bShepherd.devmgr.findDev('0x544a165e1f53');
    //     _.forEach(keyFob.servs, function (serv) {
    //         console.log(serv);
    //     });
    // }, 30000);

	bShepherd.on('IND', function(msg) {
        switch (msg.type) {
            case 'DEV_INCOMING':
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



