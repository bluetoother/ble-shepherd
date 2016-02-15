var manger = require('./ble-shepherd');

var sensorTag,
	keyFob;

manger.appInit = appInit;
manger.start(bleApp);

function appInit () {
    manger.regGattDefs('characteristic', [
        {name: 'KeyPressState', uuid: '0xffe1', params: ['enable'], types: ['uint8']}, 
        {name: 'Temp', uuid: '0xaa01', params: ['rawT2', 'rawT1'], types: ['uint16', 'uint16']}, 
        {name: 'Accelerometer', uuid: '0xaa11', params: ['x', 'y', 'z'], types: ['uint8', 'uint8', 'uint8']},
        {name: 'Gyroscope', uuid: '0xaa51', params: ['x', 'y', 'z'], types: ['uint16', 'uint16', 'uint16']}]);
}

function bleApp () {
    manger.on('IND', function(msg) {
        switch (msg.type) {
            case 'DEV_INCOMING':
                 if (msg.data === '0x9059af0b8159') {
                    sensorTag = manger.find('0x9059af0b8159');

                    // sensorTag.regCharHdlr('0xaa00', '0xaa01', callbackTemp);
                    // sensorTag.regCharHdlr('0xaa10', '0xaa11', callbackAccelerometer);
                    // sensorTag.regCharHdlr('0xaa50', '0xaa51', callbackGyroscope);
                } else if (msg.data === '0x544a165e1f53') { //0x9059af0b7722
                    keyFob = manger.find('0x544a165e1f53');

                    // keyFob.regCharHdlr('0xffe0', '0xffe1', callbackSimpleKey);
                    keyFob.setNotify('0xffe0', '0xffe1', true);
                }
                break;
            case 'DEV_LEAVING':
                break;
            case 'DEV_PAUSE':
                console.log('Pause device: ' + msg.data);
                break;
            case 'ATT_IND':
                break;
            case 'PASSKEY_NEED':
                break;
        }
    });
}

