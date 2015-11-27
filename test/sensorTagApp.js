var Q = require('q'),
    _ = require('lodash');

var bShepherd = require('../lib/ble-shepherd'),
    spConfig = {
        path: '/dev/ttyACM0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

var sensorTag, keyFob, 
    sensorTemp = 0, 
    sensorAcceler = 0;

bShepherd.preExec = preExec;
bShepherd.start(spConfig, bleApp);

function preExec () {
    // bShepherd.regGattDefs('service', [{name: 'Test', uuid: '0xFFF0'}, {name: 'SimpleKeys', uuid: '0xffe0'}, {name: 'Accelerometer', uuid: '0xffa0'}]);
    // bShepherd.regGattDefs('characteristic', [{name: 'KeyPressState', uuid: '0xffe1', params: ['Enable'], types: ['uint8']}, {name: 'Enable', uuid: '0xffa1'}, {name: 'AccelerometerX', uuid: '0xffa3'},
    //     {name: 'AccelerometerY', uuid: '0xffa4'}, {name: 'AccelerometerZ', uuid: '0xffa5'}]);
}

function bleApp () {
    sensorTag = bShepherd.devmgr.findDev('0x9059af0b8159');
    keyFob = bShepherd.devmgr.findDev('0x9059af0b7722');

    sensorTag.servs['0xaa00'].chars['0xaa01'].processInd = callbackTemp;
    sensorTag.servs['0xaa10'].chars['0xaa11'].processInd = callbackAccelerometer;
    sensorTag.servs['0xaa50'].chars['0xaa51'].processInd = callbackGyroscope;
    keyFob.servs['0xffe0'].chars['0xffe1'].processInd = callbackSimpleKey;

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
        }
    });

    keyFobSimpleKey(keyFob, 1);
}


/*****************************************************
 *    sensorTag   API                                *
 *****************************************************/
function sensorTagTemp (sensorTag, value) {
    var deferred = Q.defer(),
        congit, buf;

    if (value === 0) {
        congit = false;
        buf = new Buffer([0x00]);
    } else {
        congit = true;
        buf = new Buffer([0x01]);
    }

    sensorTag.servs['0xaa00'].chars['0xaa01'].setConfig(congit).then(function () {
        return sensorTag.servs['0xaa00'].chars['0xaa02'].write(buf);
    }).then(function () {
        console.log('Temp set to ' + congit);
        deferred.resolve();
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise;
}

function sensorTagAccelerometer (sensorTag, value) {
    var deferred = Q.defer(),
        congit, buf;

    if (value === 0) {
        congit = false;
        buf = new Buffer([0x00]);
    } else {
        congit = true;
        buf = new Buffer([0x01]);
    }

    sensorTag.servs['0xaa10'].chars['0xaa11'].setConfig(congit).then(function () {
        return sensorTag.servs['0xaa10'].chars['0xaa12'].write(buf);
    }).then(function () {
        console.log('Accelerometer set to ' + congit);
        deferred.resolve();
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise;
}

function sensorTagGyroscope (sensorTag, value) {
    var deferred = Q.defer(),
        congit, buf;

    if (value === 0) {
        congit = false;
        buf = new Buffer([0x00]);
    } else {
        congit = true;
        buf = new Buffer([0x07]);
    }

    sensorTag.servs['0xaa50'].chars['0xaa51'].setConfig(congit).then(function () {
        return sensorTag.servs['0xaa50'].chars['0xaa52'].write(buf);
    }).then(function () {
        console.log('Gyroscope set to ' + congit);
        deferred.resolve();
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise;
}

/*****************************************************
 *    keyFob   API                                   *
 *****************************************************/
function keyFobSimpleKey (keyFob, value) {
    var deferred = Q.defer(),
        congit;

    if (value === 0) { congit = false; } 
    else { congit = true; }

    keyFob.servs['0xffe0'].chars['0xffe1'].setConfig(congit).then(function () {
        console.log('keyFob SimpleKey set to ' + congit);
        deferred.resolve();
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise;
}

function keyFobAlert (keyFob, value) {
    var deferred = Q.defer();

    keyFob.servs['0x1802'].chars['0x2a06'].write({AlertLevel: value}).then(function () {
        console.log('keyFob alert set to ' + value);
        deferred.resolve();
    }).fail(function (err) {
        console.log(err);
        deferred.reject(err);
    });

    return deferred.promise;
}

/*****************************************************
 *    callback                                       *
 *****************************************************/
function callbackTemp (value) {
    var rawT1, rawT2, m_tmpAmb, Vobj2, Tdie2,  
        Tref = 298.15, 
        S, Vos, fObj, tObj;

    rawT1 = value.readUInt16LE(2);
    rawT2 = value.readUInt16LE(0);
    
    if(rawT2 > 32768) {
        rawT2 = rawT2 - 65536;
    }

    m_tmpAmb = (rawT1)/128.0;
    Vobj2 = rawT2 * 0.00000015625;
    Tdie2 = m_tmpAmb + 273.15;
    S = (6.4E-14) * (1 + (1.75E-3) * (Tdie2 - Tref) + (-1.678E-5) * Math.pow((Tdie2 - Tref), 2));
    Vos = -2.94E-5 + (-5.7E-7) * (Tdie2 - Tref) + (4.63E-9) * Math.pow((Tdie2 - Tref), 2);
    fObj = (Vobj2 - Vos) + 13.4 * Math.pow((Vobj2 - Vos), 2);
    tObj = Math.pow(Math.pow(Tdie2, 4) + (fObj/S), 0.25);
    tObj = _.ceil((tObj - 273.15), 2);

    console.log(tObj);

    if (tObj > 50) {
        keyFobAlert(keyFob, 2);
    }

}

function callbackAccelerometer (value) {
    var x = value.readUInt8(0),
        y = value.readUInt8(1),
        z = value.readUInt8(2);

    if (x > 127) { x = x - 255; }
    x = _.ceil(x / 64, 2);

    if (y > 127) { y = y - 255; }
    y = _.ceil(y / 64, 2);

    if (z > 127) { z = z - 255; }
    z = _.ceil(z / 64, 2);

    // console.log('Acc -- x: ' + x + ', y: ' + y + ', z: ' + z);

    if ((Math.abs(x) + Math.abs(y) + Math.abs(z)) > 2 || (Math.abs(x) + Math.abs(y) + Math.abs(z)) < 0.5) {
        console.log('rock!');
        keyFobAlert(keyFob, 1);
    }
}

function callbackGyroscope (value) {
    var x = value.readUInt16LE(0) / 131.072,
        y = value.readUInt16LE(2) / 131.072,
        z = value.readUInt16LE(4) / 131.072;

    if (x > 250) { x = x - 500; }
    x = _.ceil(x, 2);

    if (y > 250) { y = y - 500; }
    y = _.ceil(y, 2);

    if (z > 250) { z = z - 500; }
    z = _.ceil(z, 2);

    // console.log('Gyr -- x: ' + _.ceil(x, 2) + ', y: ' + _.ceil(y, 2) + ', z: ' + _.ceil(z, 2));

    if ((Math.abs(x) + Math.abs(y) + Math.abs(z)) > 450 || Math.abs(x) > 200 || Math.abs(y) > 200 || Math.abs(z) > 200) {
        console.log('rock!');
        keyFobAlert(keyFob, 1);
    }
}

function callbackSimpleKey (value) {
    value = value.readUInt8(0);

    if (value === 1) {
        if (sensorAcceler === 0) {
            sensorAcceler = 1;
            sensorTagTemp(sensorTag, 1).then(function () {
                return sensorTagAccelerometer(sensorTag, 1);
            });
        } else {
            sensorAcceler = 0;
            sensorTagTemp(sensorTag, 0).then(function () {
                return sensorTagAccelerometer(sensorTag, 0);
            });
        }
    } else if (value === 2) {
        keyFobAlert(keyFob, 0);
    }
}

