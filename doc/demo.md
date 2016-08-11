## Demo  

With **ble-shepherd**, it is easy and quick to implement BLE IoT apps as well as manage your BLE peripherals.  

**ble-shepherd** works well with web frameworks like [ExpressJS](#http://expressjs.com/), it's very convenient for developers to build their own RESTful services or to build graphic user interfaces for displaying device information, monitoring sensing data, and operating peripherals.  

Here is a simple ble-shepherd webapp built up with ExpressJS and [socket.io](#http://socket.io/). ExpressJS provides web sevices and socket.io passes messages back and forth between the web client and server, especially passes those asynchronous indications from remote devices to web client to avoid regularly polling.  

This demo uses a CSR8510 BLE USB dongle with 5 simultaneous connections. A polling mechanism is required if you want to connect to peripherals more than 5. The following four steps guides you through the implementation of this demo.  

- [Run the webapp with ble-shepherd](#runServer)  
- [Deal with device incoming and leaving](#devOnlineOffline)  
- [Deal with characteristic notifications](#charNotif)  
- [Control devices on the webapp GUI](#ctrlDev)  

Note: A preliminary understanding of socket.io and ExpressJS is required.  
  
![ble-shepherd webapp](https://github.com/bluetoother/documents/blob/master/ble-shepherd/bShepherdWeb.png)

<br />

*************************************************
<a name="runServer"></a>
### 4.1 Run the webapp with ble-shepherd

First, create a module named bleSocket.js and start the server in webapp(app.js). The bleSocket.js is responsible for initializing the websocket between the web client and server. Thanks to the event facilities of socket.io, now ble-shepherd can emit events to client-side through the socket. Here is the sample code:  
  
```js 
// app.js

var bleSocket = require('./routes/bleSocket');

// ...

app.set('port', process.env.PORT || 3000);
server = app.listen(app.get('port'));

bleSocket.initialize(server);
```
  
```js
// bleSocket.js

var io = require('socket.io'),
    BleShepherd = require('ble-shepherd');

var central = new BleShepherd('noble');

var connFlag = true,
    bleSocket;

exports.initialize = function(server) {
    // Express server run with socket.io 
    io = io(server);

    io.on('connection', function (socket) {
        bleSocket = socket;
        
        if (connFlag) {
            // start running ble-shepherd
            central.on('ready', bleApp)
            central.start();
            connFlag = false;
        }

        // listening 'req' event from client-side
        socket.on('cmd', clientCmdHdlr);
    });
};

// bleApp listens all types of 'ind' event emitted by ble-shepherd, 
// and assign the corresponding handler for those event.
function bleApp () {
    central.on('ind', indicationHdlr);
}
```
  
*************************************************
<a name="devOnlineOffline"></a>
### 4.2 Deal with device incoming and leaving

Let's deal with the received [`'ind'` events](https://github.com/bluetoother/ble-shepherd#EVT_ind) in our app. This demo only shows how to tackle types of the `'devIncoming'` and `'devLeaving'` indcations. Here is the example:  

```js
// bleSocket.js

function indicationHdlr (msg) {
    var dev = msg.periph;

    switch (msg.type) {
        case 'devIncoming':
            devIncomingHdlr(dev);       // dispatch to device incoming handler
            break;

        case 'devLeaving':
            devLeavingHdlr(dev);        // dispatch to device leaving handler
            break;
    }
}
```

- When received an indication of `'devIncoming'` type, check what kind of the device is and register handlers to tackle the characteristic changes. Then, broadcast the `'bleInd'` event along with a `'devIncoming'` type of indication to tell all web clients that a device has joined the network.  

    - Here is an example, assume that a device with an address of '0x9059af0b8159' joins the network. We can register handlers corresponding to each characteristic notification, and enable those characteristics to start notifying their changes.  

    ```js
    // bleSocket.js

    function devIncomingHdlr(dev) {
        var emitFlag = true,
            devName = dev.dump('0x1800', '0x2a00').value.name,
            sensorTag;
    
        // This demo uses device name to identify "_what a device is_".  
        // You can identify a device by its services, manufacturer name, 
        // product id, or something you tagged in the remote device.  

        switch (devName) {
            case 'TI BLE Sensor Tag':
                sensorTag = dev;
                // register characteristics handler
                // signature: onNotified(sid, cid, fn)
                sensorTag.onNotified('0xaa00', '0xaa01', tempCharHdlr);
                sensorTag.onNotified('0xaa10', '0xaa11', accelerometerCharHdlr);
                sensorTag.onNotified('0xaa20', '0xaa21', humidCharHdlr);
                sensorTag.onNotified('0xffe0', '0xffe1', simpleKeyCharHdlr);
    
                // enable characteristics notification
                // signature: configNotify(sid, cid, config[, callback])
                sensorTag.configNotify('0xffe0', '0xffe1', true);
                sensorTag.configNotify('0xaa00', '0xaa01', true);
                sensorTag.configNotify('0xaa10', '0xaa11', true);
                sensorTag.configNotify('0xaa20', '0xaa21', true);
                break;
            case 'Wristband X':
                // ... 
                break;
            case 'TI BLE Keyfob':
                // ...
                break;

            // ... other cases

            default:
                // the device is not a valid one in our app, remove it immediately
                // note: 
                //    Since the max simultaneous connections is 5 and we didn't implement 
                //    a polling mechanism in this simple demo, thus our app does not accept 
                //    any unrecognized pheriperal.  

                central.remove(dev.addr);
                emitFlag = false;   // No need to tell the web client about this unrecognized device
                break;
        }
    
        if (emitFlag) {
            io.sockets.emit('bleInd', { // tell the client someone is coming
                type: 'devIncoming',
                data: {
                    addr: dev.addr,
                    name: devName
                }
            });
        }
    }
    ```
- When received an indication of `'devLeaving'` type, broadcast the `'bleInd'` event with a `'devLeaving'` type of indication to tell all web clients that a device has left the network.  

```js
    // bleSocket.js

    function devIncomingHdlr(dev) {
        // ...
    }

    // ...

    function devLeavingHdlr(dev) {
        dev.status = 'offline';
        io.sockets.emit('bleInd', { // tell the client someone is leaving
            type: 'devLeaving',
            data: msg.periph
        });
    }
```

*************************************************
<a name="charNotif"></a>
### 4.3 Deal with characteristic notifications

Register a handler via onNotified() to help you with tackling the notification of a particular characteristic. You can do anything upon receiving the characteristic notification in the handler, such as collecting data for further analysis or pushing data to cloud.  
  
Let me show you an example. In `tempCharHdlr` function, I'll convert the received temperature value to Celsius within function tempConverter(), and broadcast the sensed temperature to all web clients through the websocket as well as push it to cloud. Please refer to [Texas Instruments SensorTag User Guide](http://processors.wiki.ti.com/index.php/SensorTag_User_Guide#IR_Temperature_Sensor) for how to convert the sensed raw data to temperature in Cel.  

* At server-side  

```js
// bleSocket.js

// cloud setting
var XivelyClient = require('../models/xively.js'),
    client = new XivelyClient();

// ...

function tempCharHdlr(data) {
    var tempVal = tempConverter(data),
        tempInfo = {
            devAddr: sensorTag.addr,
            sensorType: '0xaa00',
            value: tempVal
        };

    // broadcast value to all client-side
    io.sockets.emit('bleInd', {
        type: 'attrInd',
        data: tempInfo
    });

    // send the value to the cloud
    client.feed.new('99703785', 'temperature', tempVal);

    // if temperature is too high, turn on the fan
    if (tempVal > 30 && fan && fan.switch === 'off') {
        switchFan('on');
    }
}

function tempConverter(data) {
    var rawT1, rawT2, m_tmpAmb, Vobj2, Tdie2,  
        Tref = 298.15, 
        S, Vos, fObj, tempVal;

    rawT1 = data.rawT1;
    rawT2 = data.rawT2;
    
    if (rawT2 > 32768)
        rawT2 = rawT2 - 65536;

    // convert temperature to Celsius 
    m_tmpAmb = rawT1 / 128.0;
    Vobj2 = rawT2 * 0.00000015625;
    Tdie2 = m_tmpAmb + 273.15;

    S = (6.4E-14) * (1 + (1.75E-3) * (Tdie2 - Tref) + (-1.678E-5) * Math.pow((Tdie2 - Tref), 2));
    Vos = -2.94E-5 + (-5.7E-7) * (Tdie2 - Tref) + (4.63E-9) * Math.pow((Tdie2 - Tref), 2);
    fObj = (Vobj2 - Vos) + 13.4 * Math.pow((Vobj2 - Vos), 2);
    tempVal = Math.pow(Math.pow(Tdie2, 4) + (fObj/S), 0.25);
    tempVal = Number((tempVal - 273.15).toFixed(2));

    console.log('Temperature:   ' +  tempVal);
    return tempVal;
}
```

* At client-side  

```js
// client.js

var socket = io.connect('http://192.168.1.109:3000/');

socket.on('bleInd', function (msg) {
    var data = msg.data;
    
    switch (msg.type) {
        case 'devIncoming':
            // ...
            break;
        case 'devLeaving':
            // ...
            break;
        case 'attrInd':
                // update the value of device element on web page
                $('#' + data.sensorType).html('<p class="nowrap">' + data.value  + '</p>');
            break;
    }
});

// ...
```

*************************************************
<a name="ctrlDev"></a>
### 4.4 Control devices on the webapp GUI

For practical applications, we'd like a graphic user interface to control and monitor devices. For example, press an **ON** button on the screen to turn on a physical fan. In our demo app, the web client will find out the related information when button pressed. Then, the client will emit an event along with necessary data to ask the server to perform a corresponding procedure. Here is the sample code.  

* At client-side  

```js
// client.js

$('.switchOn').click(function () {
    var devId = $(this).parent().attr('devId'),
        servId = $(this).parent().attr('servId'),
        charId = '0x' + (parseInt(servId) + 1).toString(16),
        emitObj = {
            type: 'write',
            data: {
                devId: devId,
                uuidServ: servId,
                uuidChar: charId,
                val: 'on'
            }
        };
    // emit 'cmd' event with type 'write' to ask the server to write a value to the remote device.  
    socket.emit('cmd', emitObj);
});
```

* At server-side  

When the server receives an event fired by user pressing the **ON** button at client-side, the server will invoke write() method on the fan to remotely turn it on.  

```js
// bleSocket.js

exports.initialize = function (server) {
    io = io(server);

    io.on('connection', function (socket) {
        // ...
        socket.on('cmd', clientCmdHdlr);
    });
};

// ...

function clientCmdHdlr(msg) {
    var data = msg.data;

    switch (msg.type) {
        //...

        case 'write':
            if (data.devId === light.addr) {
                // ...
            } else if (data.devId === healBracelet.addr) {
                // ...
            } else if (data.devId === fan.addr) {
                if (data.val === 'on')
                    fan.write(data.uuidServ, data.uuidChar, new Buffer([0x01]));  // turn on the fan
                else
                    fan.write(data.uuidServ, data.uuidChar, new Buffer([0x00]));  // turn off the fan
            }
            break;

        // ...
    }
}
```

<br />