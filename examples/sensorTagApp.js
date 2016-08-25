var Q = require('q'),
    _ = require('lodash');

var BShepherd = require('../index'),
    path = '/dev/ttyACM0',
    options = {
        baudRate: 115200,
        rtscts: true,
        flowControl: true
    };

var central = new BShepherd('cc-bnp', path, options);
// var central = new BShepherd('noble');

var sensorTagPlg = require('bshep-plugin-ti-sensortag1'),
    keyFobPlg = require('bshep-plugin-ti-keyfob');

var sensorTag, keyFob, 
    sensorTemp = 0, 
    sensorAcceler = 0;

central.support('sensorTag', sensorTagPlg);
central.support('keyFob', keyFobPlg);

central.start();

central.on('ready', function () {
    bleApp(central);
});

function bleApp (central) {
    var dev;

    central.permitJoin(60);
    central.on('ind', function(msg) {
        var periph = msg.periph;
        
        switch (msg.type) {
            case 'devStatus':
                break;
            case 'devIncoming':
                if (periph.name === 'sensorTag') {
                    console.log('Sensor Tag join the network');

                    sensorTag = periph;

                    sensorTag.onNotified('0xaa00', '0xaa01', callbackTemp);
                    sensorTag.onNotified('0xaa10', '0xaa11', callbackAccelerometer);
                    sensorTag.onNotified('0xaa50', '0xaa51', callbackGyroscope);
                } else if (periph.name === 'keyFob') {
                    console.log('KeyFob join the network');

                    keyFob = periph;

                    keyFob.onNotified('0xffe0', '0xffe1', callbackSimpleKey);
                    keyFobSimpleKey(keyFob, 1);
                }
                break;
            case 'devLeaving':
                break;
            case 'attNotify':
                break;
            case 'attChange':
                break;
            case 'devNeedPasskey':
                break;
        }
    });
}

/*****************************************************
 *    sensorTag   API                                *
 *****************************************************/
function sensorTagTemp (sensorTag, value, callback) {
    var config, buf;

    if (value === 0) {
        config = false;
        buf = new Buffer([0x00]);
    } else {
        config = true;
        buf = new Buffer([0x01]);
    }

    sensorTag.configNotify('0xaa00', '0xaa01', config, function (err) {
        if (err) {
            console.log(err);
            callback(err);
        } else {
            sensorTag.write('0xaa00', '0xaa02', buf, function (err) {
                if (err) {
                    console.log(err);
                    callback(err);
                } else {
                    console.log('Temp set to ' + config);
                    callback(null);
                }
            });
        }
    });
}

function sensorTagAccelerometer (sensorTag, value) {
    var config, buf;

    if (value === 0) {
        config = false;
        buf = new Buffer([0x00]);
    } else {
        config = true;
        buf = new Buffer([0x01]);
    }

    sensorTag.configNotify('0xaa10', '0xaa11', config, function (err) {
        if (err) {
            console.log(err);
        } else {
            sensorTag.write('0xaa10', '0xaa12', buf, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Accelerometer set to ' + config);
                }
            });
        }
    });
}

function sensorTagGyroscope (sensorTag, value) {
    var config, buf;

    if (value === 0) {
        config = false;
        buf = new Buffer([0x00]);
    } else {
        config = true;
        buf = new Buffer([0x07]);
    }

    sensorTag.configNotify('0xaa50', '0xaa51', config, function (err) {
        if (err) {
            console.log(err);
        } else {
            sensorTag.write('0xaa50', '0xaa52', buf, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Gyroscope set to ' + config);
                }
            });
        }
    });
}

/*****************************************************
 *    keyFob   API                                   *
 *****************************************************/
function keyFobSimpleKey (keyFob, value) {
    var config;

    if (value === 0) { config = false; } 
    else { config = true; }

    keyFob.configNotify('0xffe0', '0xffe1', config, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('keyFob SimpleKey set to ' + config);
        }
    });
}

function keyFobAlert (keyFob, value) {
    keyFob.write('0x1802', '0x2a06', {alertLevel: value}, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('keyFob alert set to ' + value);
        }
    });
}

/*****************************************************
 *    Characteristic Handlers                        *
 *****************************************************/
function callbackTemp (data) {
    var rawT1, rawT2, m_tmpAmb, Vobj2, Tdie2,  
        Tref = 298.15, 
        S, Vos, fObj, tObj;

    rawT1 = data.rawT1;
    rawT2 = data.rawT2;
    
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

function callbackAccelerometer (data) {
    var x = data.x,
        y = data.y,
        z = data.z;

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

function callbackGyroscope (data) {
    var x = data.x / 131.072,
        y = data.y / 131.072,
        z = data.z / 131.072;

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

function callbackSimpleKey (data) {
    value = data.enable;

    if (value === 1) {
        if (sensorAcceler === 0) {
            sensorAcceler = 1;
            sensorTagTemp(sensorTag, 1, function (err) {
                if (!err) {
                    sensorTagAccelerometer(sensorTag, 1);
                }
            });
        } else {
            sensorAcceler = 0;
            sensorTagTemp(sensorTag, 0, function (err) {
                if (!err) {
                    sensorTagAccelerometer(sensorTag, 0);
                }
            });
        }
    } else if (value === 2) {
        keyFobAlert(keyFob, 0);
    }
}