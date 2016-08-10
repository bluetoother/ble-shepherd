#ble-shepherd
<br />

[![NPM](https://nodei.co/npm/ble-shepherd.png?downloads=true)](https://nodei.co/npm/ble-shepherd/)  

[![Travis branch](https://travis-ci.org/bluetoother/ble-shepherd.svg?branch=develop)](https://travis-ci.org/bluetoother/ble-shepherd)
[![npm](https://img.shields.io/npm/v/ble-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-shepherd)
[![npm](https://img.shields.io/npm/l/ble-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-shepherd)

## Table of Contents

1. [Overview](#Overview)    
    1.1 [Features](#Features)  
    1.2 [Installation](#Installation)  
    1.3 [Usage](#Usage)  

2. [APIs and Events](#APIs)  
3. [Advanced topics](#Advanced)  
4. [Demo](#Demo)   
5. [Example](#Example)  
6. [Contributors](#Contributors)  
7. [License](#License)  

<br />

<a name="Overview"></a>
## 1. Overview

**ble-shepherd** is a BLE network controller running on node.js. It is an extension of BLE *central* device that aims to help you in building a BLE machine network with less effort.  
  
**ble-shepherd** has all the features you need in controlling your BLE network, monitoring and operating BLE *pheripheral* devices. This controller has carried many network managing things for you, i.e., auto scanning for *pheripheral* devices, storing(/reloading) connected devices records to(/from) the built-in database, configuring connection parameters, and notifying online/offline status of devices with auto reconnection.  

It is easy to set and receive notifications from remote *peripherals*. Furthermore, reading resources from and writing values to *periphrals* is also simple, here is an example:

``` js
peripheral.read('0x1800', '0x2a00', function (err, value) {
    // value is remotely read from the peripheral device
});
peripheral.write('0x1800', '0x2a02', { flag: false }, function (err) {
    // value is remotely write to the peripheral device
});
```

With **ble-shepherd**, you can get rid of such networking things and focus on your application logics. It opens another way of implementing IoT applications with BLE devices. With node.js, you can build your own application console(or dashboard) and design your own RESTful APIs in seconds. It's easy to make your BLE devices happy on the cloud.  
  
**Note**:  
At this moment, **ble-shepherd** is built on top of [cc-bnp](https://github.com/hedywings/ccBnp) and [noble](https://github.com/hedywings/noble) libraries. They are targeting on TI [CC254X BLE Network Processor](http://processors.wiki.ti.com/index.php/CC254X_WITH_EXT_MCU#Network_Processor) and CSR8510 BLE4.0 USB adapter, respectively. This project may support TI [CC264X](http://processors.wiki.ti.com/index.php/CC2640_BLE_Network_Processor) in the near future (if I can get the development tools). Please let me know if you have any suggestions about the BLE SoC solutions.  

<br />

<a name="Features"></a>
### 1.1 Features

- Building your machine network with BLE devices.  
- Controlling the network with no pain. Features of auto reconnection, permission of device joining, built-in database, and many more are off-the-shelf.  
- Creating BLE IoT apps is simple and quick.  
- Allowing you to define _Services_ and _Characteritics_ on **ble-shepherd** itself to make it a BLE gadget. **ble-shepherd** not just plays as a network controller.  
- Based-on node.js. It's easy to integrate BLE apps with other services or frameworks, e.g., http server, express, React.js, Angular.js.  

<br />

<a name="Installation"></a>
### 1.2 Installation

> $ npm install ble-shepherd --save

<br />

<a name="Usage"></a>
### 1.3 Usage

The following example shows how to create a new instance of the `BleShepherd` class and call method `start()` to bring the `central` up with different sub-module.  

If you like to tackle something prior to your central starting, e.g., registering custom GATT definitions, just override the method `init()` to suit your needs.  
  
* Using `cc-bnp` as a sub-module  
  
```javascript
var BleShepherd = require('ble-shepherd');
var path = '/dev/ttyUSB0',  // The system path of the serial port to connect to BNP
    opts: {                 // Serial port configuration options.
        baudRate: 115200,
        rtscts: true,
        flowControl: true
    };

var central = new BleShepherd('cc-bnp', path, opts);

central.init = function () {
    // do something before app starting
    // usually register GATT definition by calling regGattDefs() here
}

central.start();
```

* Using `noble` as a sub-module  
  
```javascript
var BleShepherd = require('ble-shepherd');

var central = new BleShepherd('noble');

central.init = function () {
    // do something before app starting
    // usually register GATT definition by calling regGattDefs() here
}

central.start();
```

*************************************************

<br />

<a name="APIs"></a>
## 2. APIs and Events

####1. Control the Network 
**central** is an instance created by `new BShepherd(subModule)`, where `subModule` can be either a string of `'cc-bnp'` or `'noble'` to specify the sub-module.  

* [new BShepherd()](#API_BShepherdCcbnp) with `cc-bnp` sub-module
* [new BShepherd()](#API_BShepherdNoble) with `noble` sub-module
* [central.start()](#API_start)
* [central.stop()](#API_stop)
* [central.reset()](#API_reset)
* [central.tuneScan()](#API_tuneScan)
* [central.tuneLink()](#API_tuneLink)
* [central.permitJoin()](#API_permitJoin)
* [central.list()](#API_list)
* [central.find()](#API_find)
* [central.remove()](#API_remove)
* [central.declare()](#API_declare)
* [central.support()](#API_support)
* [central.mount()](#API_mount)
* [central.blocker](#API_blocker)
    * [blocker.enable()](#API_enable)
    * [blocker.disable()](#API_disable)
    * [blocker.isEnabled()](#API_isEnable)
    * [blocker.block()](#API_block)
    * [blocker.unblock()](#API_unblock)
* Events: [ready](#EVT_ready), [error](#EVT_error), [permitJoining](#EVT_permit) and [ind](#EVT_ind)

####2. Monitor and Control the Peripherals
**peripheral** is a software endpoint, which represents a remote BLE device, in **ble-shepherd**. You can use `central.find()` to find a connected _pheripheral_ device with its address or connection handle. Once you get the endpoint, you can invoke its read()/write() methods to operate the remote device.  

* [peripheral.connect()](#API_connect)
* [peripheral.disconnect()](#API_disconnect)
* [peripheral.tuneLink()](#API_tuneLink)
* [peripheral.secure()](#API_secure)
* [peripheral.returnPasskey()](#API_returnPasskey)
* [peripheral.maintain()](#API_maintain)
* [peripheral.read()](#API_read)
* [peripheral.write()](#API_write)
* [peripheral.readDesc()](#API_readDesc)
* [peripheral.configNotify()](#API_configNotify)
* [peripheral.onNotified()](#API_onNotified)

Some methods are not supported for noble sub-module, they are listed in this table. (X: unsupported)

| Interface                             | Method                | cc-bnp          |  noble          |
| --------------------------------------| ----------------------| --------------- | --------------- |
| Control the Network                   | start                 | O               | O               |
|                                       | stop                  | O               | O               |
|                                       | reset                 | O               | O               |
|                                       | tuneScan              | O               | O               |
|                                       | tuneLink              | O               | O               |
|                                       | permitJoin            | O               | O               |
|                                       | list                  | O               | O               |
|                                       | find                  | O               | O               |
|                                       | remove                | O               | O               |
|                                       | declare               | O               | O               |
|                                       | support               | O               | O               |
|                                       | mount                 | O               | X               |
|                                       | blocker               | O               | O               |
| Monitor and Control the Peripherals   | connect               | O               | O               |
|                                       | disconnect            | O               | O               |
|                                       | tuneLink              | O               | O               |
|                                       | secure                | O               | X               |
|                                       | returnPasskey         | O               | X               |
|                                       | maintain              | O               | O               |
|                                       | read                  | O               | O               |
|                                       | readDesc              | O               | O               |
|                                       | write                 | O               | O               |
|                                       | configNotify          | O               | O               |
|                                       | onNotified            | O               | O               |

<br />

*************************************************
## BleShepherd Class  

Exposed by `require('ble-shepherd')`

<br />

*************************************************
<a name="API_BShepherdCcbnp"></a>  
### new BleShepherd(subModule, path[, opts])  
Create a new instance of the BleShepherd class with `cc-bnp` sub-module. The created instance is denoted as `central` in this document.

**Arguments**  

1. `subModule` (*String*): `subModule` should be specified as `'cc-bnp'`.  
2. `path` (*String*): A string that refers to the serial port system path, e.g., `'/dev/ttyUSB0'`.    
3. `opts` (*Object*): An object to set up the [seiralport configuration options](https://www.npmjs.com/package/serialport#serialport-path-options-opencallback). The following example shows the `opts` with its default value.  

**Returns**  

- (*None*)  

**Example**  

```javascript
var BleShepherd = require('ble-shepherd');
var path = '/dev/ttyUSB0',  // The system path of the serial port to connect to BNP
    opts: {                 // Serial port configuration options.
        baudRate: 115200,
        rtscts: true,
        flowControl: true
    };

var central = new BleShepherd('cc-bnp', path, opts);
```

*************************************************
<a name="API_BShepherdNoble"></a>  
### new BleShepherd(subModule)  
Create a new instance of the BleShepherd class with `noble` sub-module. The created instance is denoted as `central` in this document.  

**Arguments**  

1. `subModule` (*String*): `subModule` should be specified as `'noble'`.  

**Returns**  

- (*None*)

**Example**  

```javascript
var BleShepherd = require('ble-shepherd');

var central = new BleShepherd('noble');
```

*************************************************
<a name="API_start"></a>  
### .start([callback])  
Connect to the SoC and start to run the central.  

**Arguments**  

1. `callback` (*Function*): `function (err) { }`. Get called when start to running.

**Returns**  

- (*None*)

**Example**  

```javascript
central.start(function(err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_stop"></a>  
### .stop([callback])  
Disconnect to the SoC and stop to run the central.  

**Arguments**  

1. `callback` (*Function*): `function (err) { }`. Get called when stop to running.

**Returns**  

- (*None*)

**Example**  

```javascript
central.stop(function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_reset"></a>  
### .reset([callback])  
Reset the network.  

**Arguments**  

1. `callback` (*Function*): `function (err) { }`. Get called when reset completes.

**Returns**  

- (*None*)

**Example**  

```javascript
central.reset(function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_tuneScan"></a>  
### .tuneScan(setting, [callback])  
Set up scan parameters of the BLE central.   

**Arguments**  

1. `setting` (*Object*): The following table shows the `setting` properties.  

    | Property | Type   | Mandatory | Description            | Default value |
    |----------|--------|-----------|------------------------|---------------|
    | interval | Number | optional  | Scan interval(0.625ms) | 0x0010        |
    | window   | Number | optional  | Scan window(0.625ms)   | 0x0010        |

2. `callback` (*Function*): `function (err) { }`. Get called when parameters are set.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.tuneScan({ interval: 16, window: 16 }, function (err) {
    if (err)
        console.log(err);
});

// just setting interval property of scan parameters
central.tuneScan({ interval: 4000 }, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_tuneLink"></a>  
### .tuneLink(setting, [callback])  
Set up link parameters of the BLE central.   

**Arguments**  

1. `setting` (*Object*): The following table shows the `setting` properties.  

    | Property | Type   | Mandatory | Description                                                                    | Default value |
    |----------|--------|-----------|--------------------------------------------------------------------------------|---------------|
    | interval | Number | optional  | Connection interval(1.25ms). This affects the transmission rate of connection. | 0x0018        |
    | latency  | Number | optional  | Connection slave latency(in number of connection events)                       | 0x0000        |
    | timeout  | Number | optional  | Connection supervision timeout(10ms)                                           | 0x00c8        |

2. `callback` (*Function*): `function (err) { }`. Get called when parameters are set.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.tuneLink({ interval: 8192, latency: 0, timeout: 1000 }, function (err) {
    if (err)
        console.log(err);
});

// just setting interval property of scan parameters
central.tuneLink({ interval: 4000 }, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_permitJoin"></a>  
###.permitJoin(duration)  
Allow or disallow devices to join the network. The central will fire an `'permitJoining'` event when central is opened or closed for devices to join the network.

**Arguments**  

1. `duration` (*Number*): Time in seconds for the central to allow devices to join in the network. Set it to 0 will immediately close the admission.  

**Returns**  

- (*Object*): central  

**Example**  

```javascript
// permit devices to join for 60 seconds 
central.permitJoin(60);
```

*************************************************
<a name="API_list"></a>  
###.list([addrs])  
List records of all Peripheral Devices managed by central.  

**Arguments**  

1. `addrs` (*String* | *String[]*): A single peripheral address or an array of peripheral address to query for their records. All device records will be returned if addrs is not given.

**Returns**  

- (*Array*): Information of Peripheral Devices. Each record in the array is an object with properties shown in the following table.  

    | Property    | Type   | Description                                                               |
    |-------------|--------|---------------------------------------------------------------------------|
    | addr        | String | Address of the peripheral device                                          |
    | addrType    | String | Address type of the peripheral device                                     |
    | status      | String | Device status can be `online`, `offline`, or `idle`                       |
    | connHandle  | Number | Connection handle. It will be `null` if device status is not `online`.    |
    | servList    | Array  | Service list. Each entry in `servList` is the `servInfo` object.          |
    
    - `servInfo` should be an object with the following properties
        | Property | Type   | Description                                                             |
        |----------|--------|-------------------------------------------------------------------------|
        | uuid     | String | Service UUID.                                                           |
        | handle   | Number | Service handle.                                                         |
        | charList | Array  | Characteristic list. Each entry in `charList` is the `charInfo` object. |

    - `charInfo` should be an object with the following properties
        | Property | Type   | Description                                                             |
        |----------|--------|-------------------------------------------------------------------------|
        | uuid     | String | Characteristic UUID.                                                    |
        | handle   | Number | Characteristic handle.                                                  |

**Example**  

```javascript
var devRecords = central.list()

// devRecords is an array with records to show each Peripheral's information
// [
//     {
//         addr: '0x544a165e1f53',
//         addrType: 'public',
//         status: 'online',
//         connHdl: 70,
//         servList: [
//             {
//                 uuid: '0x1800',
//                 handle: 1,
//                 charList: [
//                     { uuid: '0x2a00', handle: 3 },
//                     { uuid: '0x2a01', handle: 5 },
//                     { uuid: '0x2a02', handle: 7 },
//                     { uuid: '0x2a03', handle: 9 },
//                     { uuid: '0x2a04', handle: 11 }
//                 ]
//             },
//             {
//                 uuid: '0x1801',
//                 handle: 12,
//                 charList: [
//                     { uuid: '0x2a05', handle: 14 }
//                 ]
//             },
//             {
//                 uuid: '0x180a',
//                 handle: 16,
//                 charList: [
//                     { uuid: '0x2a23', handle: 18 },
//                     { uuid: '0x2a24', handle: 20 },
//                     { uuid: '0x2a25', handle: 22 },
//                     { uuid: '0x2a26', handle: 24 },
//                     { uuid: '0x2a27', handle: 26 },
//                     { uuid: '0x2a28', handle: 28 },
//                     { uuid: '0x2a29', handle: 30 },
//                     { uuid: '0x2a2a', handle: 32 },
//                     { uuid: '0x2a50', handle: 34 }
//                 ]
//             },
//             { 
//                 uuid: '0xffa0',
//                 handle: 35,
//                 charList: [ 
//                     { uuid: '0xffa1', handle: 37 },
//                     { uuid: '0xffa2', handle: 40 },
//                     { uuid: '0xffa3', handle: 43 },
//                     { uuid: '0xffa4', handle: 47 },
//                     { uuid: '0xffa5', handle: 51 } 
//                 ]
//             }
//         ]
//     },
//     ...
// ]
```

*************************************************
<a name="API_find"></a>  
###.find(addrOrHdl)  
Find a peripheral maintained by the central.  

**Arguments**  

1. `addrOrHdl` (*String* | *Number*): The address or connection handle of a peripheral.  

**Returns**  

- (*Object*): peripheral, an instance of the BlePeripheral class  

**Example**  

```javascript
// find() by address - use a string as the argument
var peripheral = central.find('0x78c5e570796e');

// find() by connection handle - use a number as the argument
var peripheral = central.find(0);
```

*************************************************
<a name="API_remove"></a>  
###.remove(addrOrHdl, callback)  
Disconnect from the remote BLE peripheral and remove its record from database. The central will fire an `'ind'` event with meaasge type `'devLeaving'` when procedure of disconnecting accomplished.  

**Arguments**  

1. `addrOrHdl` (*String* | *Number*): The address or connection handle of a peripheral which to be removed.  

**Returns**  
- (*none*)

**Example**  

```javascript
central.on('ind', function (msg) {
    if (msg.type === 'devLeaving')
        console.log(msg);
});

central.remove(0, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_declare"></a>  
###.declare(type, regObjs)  
Allows you to declare private Services or Characteristic definitions.  

**Arguments**  

1. `type` (*String*): Can be `'service'` or `'characteristic'` to specify which type of definition to register with.  
2. `regObjs` (*Array*): An array of the _Service information object_ or _Characteristic information object_ according to the given `type`.  

Note: Learn more in section **Advanced topics**: [How to define your own Services and Characteristics](https://github.com/bluetoother/ble-shepherd/blob/develop/doc/advanced_topics.md#1-how-to-define-your-own-services-and-characteristics).  

**Returns**  

- (*Object*): central  

**Example**  

```javascript
// declare service definition
central.declare('service', [
    { name: 'simpleKeys', uuid: '0xffe0' },
    { name: 'accelerometer', uuid: '0xffa0' }
]);

// declare characteristic definition
central.declare('characteristic', [
    { name: 'keyPressState', uuid: '0xffe1', params: [ 'enable' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerX', uuid: '0xffa3', params: [ 'x' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerY', uuid: '0xffa4', params: [ 'y' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerZ', uuid: '0xffa5', params: [ 'z' ], types: [ 'uint8' ] }, 
]);
```

*************************************************
<a name="API_support"></a>  
###.support(devName, plugin)  
Register a plugin provided by the third-party module. The plugin tells **ble-shepherd** of how to recognize a third-party BLE module/product.  

**Arguments**  

1. `devName` (*String*): The name you'd like to use for the peripherals recognized by this plugin.  
2. `plugin` (*Object*): An plugin object provided by the device manufacturer.  

Note: Learn more in section **Advanced topics**: [How to create a Plugin for your own device.](https://github.com/bluetoother/ble-shepherd/blob/develop/doc/advanced_topics.md#addPlugin).  

**Returns**  

- (*Boolean*): `true` if registration succeeds, otherwise `false`.  
  
**Example**  
  
```javascript
// Require the plugin 'bshep-plugin-sivann-relay' for relay modules manufactured by sivann  
var sivannRelayPlugin = require('bshep-plugin-sivann-relay'); 

central.support('sivann-relay', sivannRelayPlugin);
central.start(app);

function app (central) {
    central.on('IND', function (msg) {
        var dev;

        switch (msg.type) {
            case 'DEV_INCOMING':
                dev = msg.data;

                if (dev.name === 'sivann-relay') {
                    // Do what you'd like to do with your 'sivann-relay' here,  
                    // such as attaching your notification handler or doing something magic to it  
                }
                break;

            case 'DEV_LEAVING':
                // ...
                break;
            case 'DEV_ONLINE':
                // ...
                break;
            
            // ...
        }
    });
}
```

*************************************************
<a name="API_blocker"></a>  
### .blocker(onOff[, type])  
Enable the blocker to ban unauthorized devices according to the blacklist or the whitelist. You cannot use the blacklist and the whitelist simultaneously, so pick one you like to use.  

**Arguments**  

1. `onoff` (*Boolean*): Set to `true` to enable blocker. Set to `false` to disable the blocker.  

2. `type` (*String*) : Can be `'black'` or `'white'` to enable the block with the blacklist or the whitelist. The blacklist will be used if not given.  

**Returns**  

- (*object*): central  

**Example**  

```javascript
// enable with the blacklist
central.blocker(true, 'black');

// disable the blocker
central.blocker(false);

// enable with the whitelist
central.blocker(true, 'white');
```

*************************************************
<a name="API_ban"></a>  
### .ban(addr[, callback])  
Ban a device from the network. You **must** have the blocker enabled with the blacklist, or this method will not function properly.  

**Arguments**  

1. `addr` (*String*): Address of the peripheral device.  
2. `callback` (*Function*): `function (err) {}`. Get called when device successfully ban from the network.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.ban('0xd05fb820a6bd');
```

*************************************************
<a name="API_unban"></a>  
### .unban(addr[, callback])  
Unban a device from the network. You **must** have the blocker enabled with the blacklist, or this method will not function properly.  

**Arguments**  

1. `addr` (*String*): Address of the peripheral device.  
2. `callback` (*Function*): `function (err) {}`. Get called when device successfully unban from the network.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.unban('0xd05fb820a6bd');
```

*************************************************
<a name="API_allow"></a>  
### .allow(addr[, callback])  
Allow a specific device from the network. You **must** have the blocker enabled with the whitelist, or this method will not function properly.  

**Arguments**  

1. `addr` (*String*): Address of the peripheral device.  
2. `callback` (*Function*): `function (err) {}`. Get called when device successfully allow from the network.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.allow('0xd05fb820a6bd');
```

*************************************************
<a name="disallow"></a>  
### .disallow(addr[, callback])  
Disallow a specific device to join the network. You **must** have the blocker enabled with the whitelist, or this method will not function properly.  

**Arguments**  

1. `addr` (*String*): Address of the peripheral device.  
2. `callback` (*Function*): `function (err) {}`. Get called when device successfully disallow from the network.  

**Returns**  

- (*None*)

**Example**  

```javascript
central.disallow('0xd05fb820a6bd');
```

<br />

*************************************************

<a name = "EVT_ready"></a>
###Event: 'ready'  

Event Handler: `function() { }`  
The central will fire an `ready` event when central is ready.  

*************************************************

<a name = "EVT_error"></a>
###Event: 'error'  

Event Handler: `function(err) { }`  
The central will fire an `error` event when an error occurs.  

*************************************************

<a name = "EVT_permit"></a>
###Event: 'permitJoining'  

Event Handler: `function(joinTimeLeft) { }`  
The central will fire an `permitJoining` event when the central is allowing for devices to join the network, where `joinTimeLeft` is number of seconds left to allow devices to join the network. The event will be triggered at each tick of countdown.  

*************************************************

<a name = "EVT_ind"></a>  
###Event: 'ind'  

Event Handler: `function(msg) { }`  
The central will fire an `ind` event upon receiving an indication from a peripheral. The `msg` is an object with the properties given in the table:

| Property | Type            | Description                                                                                                                                 |
|----------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| type     | String          | Indication type, can be `'devIncoming'`, `'devLeaving'`, `'devStatus'`, `'devNeedPasskey'`, `'attNotify'` and  `'attChange'`.               |
| periph   | Object | String | peripheral instance, except that when type === 'devLeaving', peripheral will be a string of the address (since peripheral has been removed) |
| data     | Depends         | Data along with the indication, which depends on the type of indication                                                                     |


*  ####DEV_ONLINE**  

    A peripheral has just joined the network, but not yet synchronized with the remote device (services re-discovery will run in background).  
  
    - `msg.type` (*String*): `'DEV_ONLINE'`  
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_ONLINE',
        data: '0x78c5e570796e'
    }
    ```

<br />

*  #### 'devIncoming'  

    A peripheral has joined the network and synchronized with the remote.  

    * `msg.type` (*String*): `'devIncoming'`  
    * `msg.periph` (*Object*): peripheral
    * `msg.data` (*String*): `undefined`

<br />

*  #### 'devLeaving'  

    A peripheral has just left the network.  

    * `msg.type` (*String*): `'devLeaving'`  
    * `msg.periph` (*String*): The address of which peripheral is leaving   
    * `msg.data` (*String*): Peripheral address  

<br />

*  #### 'devStatus'  

    A peripheral has going online, going offline, or going to idle.

    * `msg.type` (*String*): `'devStatus'` 
    * `msg.periph` (*Object*): peripheral 
    * `msg.data` (*String*): `'online'`, `'offline'`, or `'idle'`

    *  Note: 
        Due to limitation of the number of connections, 

<br />

- **DEV_IDLE**  

    A peripheral has just idle in order to allow other peripheral to join the network. (Due to limitation of the number of connections)  

    - `msg.type` (*String*): `'DEV_IDLE'`  
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_IDLE',
        data: '0x78c5e570796e'
    }
    ```

<br />

- **NWK_PERMITJOIN**  

    Central is now allowing or disallowing devices to join the network.  

    - `msg.type` (*String*): `'NWK_PERMITJOIN'`  
    - `msg.data` (*Number*): Time left for devices to join the network. Permission denied when it is 0.  

    ```js
    {
        type: 'NWK_PERMITJOIN',
        data: 60
    }
    ```

<br />

- **ATT_IND**  

    Characteristic value indication or notification.  

    - `msg.type` (*String*): `'ATT_IND'`  
    - `msg.data` (*Number*): This object has fileds of `addr`, `servUuid`, `charUuid`, and `value`.  

    ```js
    {
        type: 'ATT_IND',
        data: {
            addr: '0x78c5e570796e',
            servUuid: '0xffe0',
            charUuid: '0xffe1',
            value: { enable: 0 }
        }
    }
    ```

<br />

- **PASSKEY_NEED**  

    A connection is requesting for a passkey in encryption process. This event is cc-bnp only.  

    - `msg.type` (*String*): `'PASSKEY_NEED'`  
    - `msg.data` (*Object*): This object has fileds of `devAddr`, `connHandle`, `uiInput`, and `uiOutput`.  

    ```js
    { 
        type: 'PASSKEY_NEED',
        data: {
            devAddr: '0x78c5e570796e',
            connHandle: 0,
            uiInput: 1,     // Whether to ask user to input a passcode, 0 or 1 means no or yes
            uiOutput: 0     // Whether to display a passcode, 0 or 1 means no or yes
        }
    }
    ```

<br />

- **LOCAL_SERV_ERR**  

    An error occurs while processing an incoming peripheral ATT event. This event is cc-bnp only.  

    - `msg.type` (*String*): `'LOCAL_SERV_ERR'`  
    - `msg.data` (*Object*): This object has fileds of `evtData` and `err`. `evtData` is the request message emitted from a remote peripheral, `err` is an error object describing the reason why this request cannot be processed.  

    ```js
    {
        type: 'LOCAL_SERV_ERR',
        data: {
            evtData: {
                evtName: 'AttReadReq',
                data: {
                    status: 0,
                    connHandle: 0,
                    pduLen: 2,
                    handle: 3
                }
            },
            err: [ Error: Characteristic: 0xfe00 not register. ]
        }
    }
    ```

<br />

***********************************************

## BlePeripheral Class  

`central.find(addrOrHdl)` returns an instance of this class, otherwise returns `undefined` if not found. The instance, which is denoted as `peripheral` in this document, represents a remote peripheral in the server.  

<br />

*************************************************

<a name="API_connect"></a>  
###.connect([callback])  
Connect to a remote BLE peripheral. The central will fire an `'IND'` event with message type `'DEV_ONLINE'` when connection is established and will fire an `'IND'` event with message type `'DEV_INCOMING'` when peripheral synchronization accomplished.  

**Arguments**  
- `callback` (*Function*): `function (err) { }`. Get called when connection between central and remote peripheral is established.  

**Returns**  
- (*none*)  

**Example**  

```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_ONLINE')
        console.log(msg);
});

central.on('IND', function (msg) {
    if (msg.type === 'DEV_INCOMING')
        console.log(msg);
});

var peripheral = central.find('0x78c5e570796e');
if (peripheral) {
    peripheral.connect(function (err) {
        if (err)
            console.log(err);
    });
}
```

*************************************************
<a name="API_disconnect"></a>  
###.disconnect([callback])  
Disconnect from the remote BLE peripheral. The central will fire an `'IND'` event with meaasge type `'DEV_LEAVING'` when procedure of disconnecting accomplished.  

**Arguments**  
- `callack` (*Function*): `function (err) { }`. Get called when connection between central and remote peripheral is disconnected.  

**Returns**  
- (*none*)

**Example**  
```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_LEAVING')
        console.log(msg);
});

peripheral.disconnect(function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_updateLinkParam"></a>  
###.updateLinkParam(interval, latency, timeout[, callback])  
Update link parameters of the peripherial.  

**Arguments**  

1. `interval` (*Number*): Connection interval (1.25ms).  
2. `latency` (*Number*): Slave latency.  
3. `timeout` (*Number*): Connection supervision timeout (10ms).  
4. `callback` (*Function*): `function (err) { }`. Get called when parameters are set.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.updateLinkParam(80, 0, 2000, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_encrypt"></a>  
###.encrypt([setting][, callback])  
Encrypt the connection between central and peripheral. The central will fire an `'IND'` event along with message type `'PASSKEY_NEED'` if it requires a passkey during encryption procedure for MITM protection.  

Note: This command is cc-bnp only.  

**Arguments**  

1. `setting` (*Object*): Peripheral security setting. The following table shows the details of each property.  
2. `callback` (*Function*): `function (err) { }`. Get called when encryption completes.  

| Property | Type     | Mandatory | Description     | Default value |
|----------|----------|-----------|-----------------|---------------|
| pairMode | Number   | Optional  | pairing mode    | 0x01          |
| ioCap    | Number   | Optional  | io capabilities | 0x04          |
| mitm     | Boolean  | Optional  | MITM protection | true          |
| bond     | Boolean  | Optional  | bonding enable  | true          |

Note: Please refer to document [TI BLE Vendor Specific HCI Guide.pdf (P77)](https://github.com/hedywings/ccBnp/raw/master/documents/TI_BLE_Vendor_Specific_HCI_Guide.pdf) for `pairMode` and `ioCap` descriptions.  

**Returns**  

- (*none*)  

**Example**  

```javascript
var setting = {
    pairMode: 0x01, // WaitForReq
    ioCap: 0x04,    // KeyboardDisplay
    mitm: true,
    bond: true
}

central.on('IND', function (msg) {
    if (msg.type === 'PASSKEY_NEED') {
        // find the peripheral and send passkey to it by calling passPasskey() here
        console.log(msg);
    }
});

peripheral.encrypt(setting, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_passPasskey"></a>  
###.passPasskey(passkey[, callback])  
Send the passkey required by the encryption procedure.  

Note: This command is cc-bnp only.  

**Arguments**  

1. `passkey` (*String*): 6 character ASCII string of numbers (ex. '019655')  
2. `callback` (*Function*): `function (err) { }`. Get called when passkey successfuly transmitted to the remote peripheral.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.passPasskey('123456', function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_update"></a>  
###.update([callback])  
Update the `peripheral` instance with latest Characteristic Values reading from the remote device.  

**Arguments**  

1. `callback`(*Function*): `function (err) { }`. Get called when updated.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.update(function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_findChar"></a>  
###.findChar(uuidServ, uuidChar)  
Find a characteristic endpoint on the peripheral.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.   

**Returns**  

- (*Object*): characteristic, an instance of the BleCharacteristic class  

**Example**  

```javascript
var char = peripheral.find('0x1800', '0x2a00');
```

*************************************************
<a name="API_read"></a>  
###.read(uuidServ, uuidChar, callback)  
Read the value of an allocated Characteristic from the remote device.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `callback` (*Function*): `function (err, value) { }`. Get called along with the read value.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.read('0x1800', '0x2a00', function (err, value) {
    if (err)
        console.log(err);
    else
        console.log(value);
});
```

*************************************************
<a name="API_write"></a>  
###.write(uuidServ, uuidChar, value[, callback])  
Write a value to the allocated Characteristic on the remote device.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `value` (*Object* | *Buffer*): Characteristic value. If the Characteristic is not a public one or is not registered through `central.regGattDefs()`, the `value` must be given with a buffer.  
4. `callback` (*Function*): `function (err) { }`. Get called when written.  

**Returns**  

- (*none*)  

**Example**  

```javascript
// characteristic is public
peripheral.write('0x1800', '0x2a02', { flag: true }, function (err) {
    if (err)
        console.log(err);
});

// characteristic is private and its definition is not registered  
peripheral.write('0xfff0', '0xfff3', new Buffer([ 1 ]), function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_readDesc"></a>  
###.readDesc(uuidServ, uuidChar, callback)  
Read the description from an allocated Characteristic on the remote device.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `callback` (*Function*): `function (err, description) { }`. Get called along with a characteristic description when the reading completes.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.readDesc('0xfff0', '0xfff1', function (err, description) {
    if (err)
        console.log(err);
    else
        console.log(description);
});
```

*************************************************
<a name="API_setNotify"></a>  
###.setNotify(uuidServ, uuidChar, config[, callback])  
Enable or disable the indication/notification of a Characteristic.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `config` (*Boolean*): `true` to enable and `false` to disable indication/notification of the characteristic.  
4. `callback` (*Function*): `function (err) { }`. Get called when the configuration is set.  

**Returns**  

- (*none*)  

**Example**  

```javascript
peripheral.setNotify('0xfff0', '0xfff4', true, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_regCharHdlr"></a>  
###.regCharHdlr(uuidServ, uuidChar, fn)  
Register a handler to handle notification or indication of the Characteristic.  

**Arguments**  

1. `servUuid` (*String*): Service uuid  
2. `charUuid` (*String*): Characteristic uuid  
3. `fn` (*Function*): Handler function  

**Returns**  

- (*object*): peripheral  

**Example**  

```javascript
    peripheral.regCharHdlr('0xffe0', '0xffe1', processInd);

    function processInd (data) {
        console.log(data);
    }
```

*************************************************

<br />

<a name="Advanced"></a>
## 3. Advanced topics  

Here is a [tutorial of the advanced topics](https://github.com/bluetoother/ble-shepherd/blob/develop/doc/advanced_topics.md) to illustrate how to do further settings in ble-shepherd, e.g., register private definitions.  

- How to define your own Services and Characteristics.  
- How to add your own Services to central.  
- How to create a Plugin belong your own device.  

<br />

*************************************************

<a name="Demo"></a>
## 4. Demo  

[Here is the document](https://github.com/bluetoother/ble-shepherd/blob/develop/doc/demo.md) that show you a simple ble-shepherd webapp built up with ExpressJS and [socket.io](#http://socket.io/).  

![ble-shepherd webapp](https://github.com/bluetoother/documents/blob/master/ble-shepherd/bShepherdWeb.png)

<br />

<a name="Example"></a>
## 5. Example  

[sensorTagApp.js](https://github.com/hedywings/ble-shepherd/blob/develop/examples/sensorTagApp.js) is a very simple application with a sensorTag and a keyFob.  

<br />

<a name="Contributors"></a>
## 6. Contributors  
  
* [Hedy Wang](https://www.npmjs.com/~hedywings)  
* [Peter Yi](https://www.npmjs.com/~petereb9)  
* [Simen Li](https://www.npmjs.com/~simenkid)  

<br />

<a name="License"></a>
## 7. License  
  
The MIT License (MIT)

Copyright (c) 2016
Hedy Wang <hedywings@gmail.com>, Peter Yi <peter.eb9@gmail.com>, and Simen Li <simenkid@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:  

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
