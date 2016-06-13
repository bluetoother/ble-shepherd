#ble-shepherd
<br />

## Table of Contents

1. [Overview](#Overview)    
    1.1 [Features](#Features)  
    1.2 [Installation](#Installation)  
    1.3 [Usage](#Usage)  

2. [APIs and Events](#APIs)  

3. [Advanced topics](#Advanced)  
    3.1 [How to define your own Services and Characteristics](#addDefinition)  
    3.2 [How to add your own Services to central](#addService)  

4. [Demo](#Demo)  
    4.1 [Run the webapp with ble-shepherd](#runServer)  
    4.2 [Deal with device online and offline status](#devOnlineOffline)  
    4.3 [Deal with characteristic notifications](#charNotif)  
    4.4 [Control devices on the webapp GUI](#ctrlDev)  

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

**ble-shepherd** exports its functionalities as a singleton denoted as `central` in this document. The following example shows how to create an application with **ble-shepherd** with CC254X BLE network processor(BNP) (see [central.start()](#API_start) if you like to use CSR BLE USB dongle).  

Firstly, set up your serial-port configuration to connect to BNP. Next, call method `start()` with your configuration `spCfg` and application `app()` to bring the `central` up. Your `app()` will run right after the central connected to BNP. If you like to tackle something prior to your app loading, e.g., registering custom GATT definitions, just override the method `appInit()` to suit your needs.  
  
  
```javascript
var central = require('ble-shepherd')('cc-bnp');
var spCfg = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

central.appInit = function () {
    // do something before app starting
    // usually register GATT definition by calling regGattDefs() here
}

central.start(app, spCfg);

function app() {
    // your application
}
```

*************************************************

<br />

<a name="APIs"></a>
## 2. APIs and Events

####1. Control the Network 
>**central** is a singleton exported by `require('ble-shepherd')(submodule)`, where `subModule` can be either a string of `'cc-bnp'` or `'noble'` to specify the submodule.  

* [central.start()](#API_start)
* [central.stop()](#API_stop)
* [central.reset()](#API_reset)
* [central.setNwkParams()](#API_setNwkParams)
* [central.permitJoin()](#API_permitJoin)
* [central.command()](#API_command)
* [central.listDevices()](#API_listDevices)
* [central.find()](#API_find)
* [central.regGattDefs()](#API_regGattDefs)
* [central.addLocalServ()](#API_addLocalServ)
* ['IND' event](#EVT_ind)

####2. Monitor and Control the Peripherals
>**peripheral** is a software endpoint, which represents a remote BLE device, in **ble-shepherd**. You can use `central.find()` to find a connected _pheripheral_ device with its address or connection handle. Once you get the endpoint, you can invoke its read()/write() methods to operate the remote device.  

* [peripheral.connect()](#API_connect)
* [peripheral.disconnect()](#API_disconnect)
* [peripheral.remove()](#API_remove)
* [peripheral.updateLinkParam()](#API_updateLinkParam)
* [peripheral.encrypt()](#API_encrypt)
* [peripheral.passPasskey()](#API_passPasskey)
* [peripheral.readDesc()](#API_readDesc)
* [peripheral.setNotify()](#API_setNotify)
* [peripheral.update()](#API_update)
* [peripheral.read()](#API_read)
* [peripheral.write()](#API_write)
* [peripheral.regCharHdlr()](#API_regCharHdlr)

Some methods are not supported for noble submodule, they are listed in this table. (X: unsupported)

| Interface                             | Method            | cc-bnp          |  noble          |
| --------------------------------------| ------------------| --------------- | --------------- |
| Control the Network                   | start             | O               | O               |
|                                       | stop              | O               | O               |
|                                       | reset             | O               | O               |
|                                       | setNwkParams      | O               | O               |
|                                       | permitJoin        | O               | O               |
|                                       | command           | O               | X               |
|                                       | listDevices       | O               | O               |
|                                       | find              | O               | O               |
|                                       | regGattDefs       | O               | O               |
|                                       | addLocalServ      | O               | X               |
| Monitor and Control the Peripherals   | connect           | O               | O               |
|                                       | disconnect        | O               | O               |
|                                       | remove            | O               | O               |
|                                       | updateLinkParam   | O               | O               |
|                                       | encrypt           | O               | X               |
|                                       | passPasskey       | O               | X               |
|                                       | readDesc          | O               | O               |
|                                       | setNotify         | O               | O               |
|                                       | update            | O               | O               |
|                                       | read              | O               | O               |
|                                       | write             | O               | O               |
|                                       | regCharHdlr       | O               | O               |

<br />

*************************************************
## BleShepherd Class  

`require('ble-shepherd')(submodule)` exports the singleton of this class. This singleton instance is denoted as `central` in this document.  

<br />

*************************************************
<a name="API_start"></a>  
### .start(app[, spCfg][, callback])  
> Connect to the SoC and start to run the app.  

**Arguments**  

1. `app` (*Function*): `function (central) { }`. App which will be called after initialization completes.  
2. `spCfg` (*Object*): This value-object has two properties `path` and `options` to configure the serial port.  
    - `path`: A string that refers to the serial port system path, e.g., `'/dev/ttyUSB0'`  
    - `options`: An object to set up the [seiralport](https://www.npmjs.com/package/serialport#to-use). The following example shows the `options` with its default value.  
3. `callback` (*Function*): `function (err) { }`. Get called when start to running.

Note: If you are using the noble as a submodule, `spCfg` can be ignored.

**Returns**  

- (*None*)

**Example**  

* Using cc-bnp as a submodule

```javascript
var central = require('ble-shepherd')('cc-bnp');
var app,
    spCfg = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

app = function () {
    // your application
};

central.start(app, spCfg);
```

* Using noble as a submodule

```javascript
var central = require('ble-shepherd')('noble');
var app = function () {
    // your application
};

central.start(app); // spCfg is not required
```

*************************************************
<a name="API_stop"></a>  
### .stop([callback])  
> Disconnect to the SoC and stop to run the app.  

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
> Reset the network.  

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
<a name="API_setNwkParams"></a>  
###.setNwkParams(type, setting[, callback])  
> Set up network parameters of the BLE central.  

**Arguments**  

1. `type` (*String*): Can be `'scan'` or `'link'` to indicate which type of parameter you like to set.  
2. `setting` (*Object*): The following table shows the `setting` properties according to the given `type`.  

    - When `type === 'scan'`, the setting object should be with keys:  
    

    | Property | Type   | Mandatory | Description       | Default value |
    |----------|--------|-----------|-------------------|---------------|
    | interval | Number | optional  | Scan interval(0.625ms) | 0x0010        |
    | window   | Number | optional  | Scan window(0.625ms)   | 0x0010        |

    - When `type === 'link'`, the setting object should be with keys:
    

    | Property | Type   | Mandatory | Description                                                                    | Default value |
    |----------|--------|-----------|--------------------------------------------------------------------------------|---------------|
    | interval | Number | optional  | Connection interval(1.25ms). This affects the transmission rate of connection. | 0x0018        |
    | latency  | Number | optional  | Connection slave latency(in number of connection events)                       | 0x0000        |
    | timeout  | Number | optional  | Connection supervision timeout(10ms)                                           | 0x00c8        |

3. `callback` (*Function*): `function (err) { }`. Get called when parameters are set.  

**Returns**  

- (*none*)  

**Example**  

```javascript
// setting scan parameters
central.setNwkParams('scan', { interval: 16, window: 16 }, function (err) {
    if (err)
        console.log(err);
});

// setting link parameters
central.setNwkParams('link', { interval: 8192, latency: 0, timeout: 1000 }, function (err) {
    if (err)
        console.log(err);
});

// just setting interval property of link parameter
central.setNwkParams('link', { interval: 4000 }, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_permitJoin"></a>  
###.permitJoin(duration)  
> Allow or disallow devices to join the network. The central will fire an `'IND'` event with message type `'NWK_PERMITJOIN'` when central is opened or closed for devices to join the network.

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
<a name="API_command"></a>  
###.command(subGroup, cmd, argInst, callback)  
> Invoke TI BLE Vendor-Specific HCI Commands. Please refer to [**cc-bnp**](https://github.com/hedywings/cc-bnp) document for details.
> - [TI's BLE Vendor-Specific HCI Command APIs](https://github.com/hedywings/cc-bnp#vendorHci)
> - [Vendor-Specific HCI Command Reference Tables](https://github.com/hedywings/cc-bnp#cmdTables)

Note: This API is cc-bnp only.

**Arguments**  

1. `subGroup` (*String*): Sub-group name. Can be `hci`, `l2cap`, `att`, `gatt`, `gap`, or `util`.  
2. `cmd` (*String*): Function name of Vendor-Specific HCI Command API. You can find the function name from column **Cmd-API** in this [table](https://github.com/hedywings/cc-bnp#cmdTables).  
3. `args` (_Object_): An argument object passes with the specified command. The accepted keys are listed in column **Arguments** in this [table](https://github.com/hedywings/cc-bnp#cmdTables).  
4. `callback` (*Function*): `function (err, result) { }`. Get called with the result of execution.  

**Returns**  

- (*none*)
  
**Example**  
  
```javascript
    // example of calling deviceDiscReq() from the subGroup 'gap'
    central.command('gap', 'deviceDiscReq', { mode: 3, activeScan: 1, whiteList: 0 }, function (err, result) {
        if (err)
            console.log(err);
        else
            console.log(result);
    });
```

*************************************************
<a name="API_listDevices"></a>  
###.listDevices()  
> List records of the Peripheral Devices maintained by central.  

**Arguments**  

1. (*none*)

**Returns**  

- (*Array*): Information of Peripheral Devices. Each record in the array is an object with the properties shown in the following table.  

| Property | Type   | Description                                                                                                                               |
|----------|--------|-------------------------------------------------------------------------------------------------------------------------------------------|
| addr     | String | Address of the peripheral device                                                                                                          |
| addrType | String | Address type of the peripheral device                                                                                                     |
| state    | String | `online` or `offline` or `idle`                                                                                                           |
| connHdl  | Numbet | Connection handle. If state is not `online`, it should be null.                                                                           |
| servList | Object | Service and Characteristic list. Each key in `servList` is the `servUuid` and each value is an array of `charUuid` under the `servUuid`.  |

**Example**  

```javascript
var devRecords = central.listDevices()

// devRecords equal to 
// [
//     {
//         addr: ''0x544a165e1f53',
//         addrType: 'public',
//         state: 'online',
//         connHdl: 70,
//         servs: {
//             '0x1800': [ '0x2a00', '0x2a01', '0x2a02', '0x2a03', '0x2a04' ],
//             '0x1801': [ '0x2a05' ],
//             '0x180a': [ '0x2a23', '0x2a24', '0x2a25', '0x2a26', '0x2a27', '0x2a28', '0x2a29', '0x2a2a', '0x2a50' ],
//             '0x1803': [ '0x2a06' ],
//             '0x1802': [ '0x2a06' ],
//             '0x1804': [ '0x2a07' ],
//             '0x180f': [ '0x2a19' ],
//             '0xffa0': [ '0xffa1', '0xffa2', '0xffa3', '0xffa4', '0xffa5' ],
//             '0xffe0': [ '0xffe1' ]
//         }
//     },
//     {
//         addr: ''0x9059af0b8159',
//         addrType: 'public',
//         state: 'online',
//         connHdl: 65,
//         servs: {
//             '0x1800': [ '0x2a00', '0x2a01', '0x2a02', '0x2a03', '0x2a04' ],
//             '0x1801': [ '0x2a05' ],
//             '0x180a': [ '0x2a23', '0x2a24', '0x2a25', '0x2a26', '0x2a27', '0x2a28', '0x2a29', '0x2a2a', '0x2a50' ],
//             '0xaa00': [ '0xaa01', '0xaa02' ],
//             '0xaa10': [ '0xaa11', '0xaa12', '0xaa13' ],
//             '0xaa20': [ '0xaa21', '0xaa22' ],
//             '0xaa30': [ '0xaa31', '0xaa32', '0xaa33' ],
//             '0xaa40': [ '0xaa41', '0xaa42', '0xaa43' ],
//             '0xaa50': [ '0xaa51', '0xaa52' ],
//             '0xffe0': [ '0xffe1' ],
//             '0xaa60': [ '0xaa61', '0xaa62' ],
//             '0xffc0': [ '0xffc1', '0xffc2' ]
//         }
//     }
// ]
```

*************************************************
<a name="API_find"></a>  
###.find(addrOrHdl)  
> Find a peripheral maintained by the central.  

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
<a name="API_regGattDefs"></a>  
###.regGattDefs(type, regObjs)  
> Allows you to register private Services or Characteristic definitions.  

**Arguments**  

1. `type` (*String*): Can be `'service'` or `'characteristic'` to specify which type of definition to register with.  
2. `regObjs` (*Array*): An array of the _Service information object_ or _Characteristic information object_ according to the given `type`.  

Note: Learn more in section **Advanced topics**: [How to define your own Services and Characteristics](#addDefinition).

**Returns**  

- (*Object*): central   
  
**Example**  
  
```javascript
// register service definition
central.regGattDefs('service', [
    { name: 'simpleKeys', uuid: '0xffe0' },
    { name: 'accelerometer', uuid: '0xffa0' }
]);

// register characteristic definition
central.regGattDefs('characteristic', [
    { name: 'keyPressState', uuid: '0xffe1', params: [ 'enable' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerX', uuid: '0xffa3', params: [ 'x' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerY', uuid: '0xffa4', params: [ 'y' ], types: [ 'uint8' ] }, 
    { name: 'accelerometerZ', uuid: '0xffa5', params: [ 'z' ], types: [ 'uint8' ] }, 
]);
```
  
*************************************************
<a name="API_addLocalServ"></a>  
### .addLocalServ(servInfo[, callback])  
> Register a Service to the BLE central.  
 
Note: This command is cc-bnp only.

**Arguments**  

1. `servInfo` (*Object*): An object that contains properties of `uuid`, `name`, and `charsInfo` to describe information about the Service.  

2. `callback` (*Function*) : `function (err, service) { }`, Get called when service successfully register to BNP. 

Note: Learn more in section **Advanced topics**: [How to add your own Services to central](#addService).

**Returns**  

- (*none*)  

**Example**  

```javascript
// Step1: prepare characteristic and service information
var charsInfo = [
        { uuid: '0x2a00', permit: [ 'Read' ], prop: [ 'Read' ], val: { name: "BLE Shepherd" } },
        { uuid: '0x2a28', permit: [ 'Read' ], prop: [ 'Read' ], val: { softwareRev: '0.0.1' } },
        { uuid: '0x2a29', permit: [ 'Read' ], prop: [ 'Read '], val: { manufacturerName: 'sivann' } }
    ],
    servInfo = {
        uuid: '0x1800',
        charsInfo : charsInfo
    };

// Step2: Register to central 
central.addLocalServ(servInfo, function (err, result) {
    if (err)
        console.log(err);
    else
        console.log(result);
});
```

*************************************************

<br />

<a name = "EVT_ind"></a>  
##Event: 'IND'    
> The central will fire an `IND` event upon receiving an indication from a peripheral. Incoming messages will be classified by `msg.type` along with some data `msg.data`.  
>   
> Event Handler: `function(msg) { }`  

 The `msg.type` can be `DEV_ONLINE`, `DEV_INCOMING`, `DEV_LEAVING`, `DEV_PAUSE`, `NWK_PERMITJOIN`, `ATT_IND`, `PASSKEY_NEED` or `LOCAL_SERV_ERR` to reveal the message purpose.  

- **DEV_ONLINE** 

    A peripheral has just joined the network, but not yet synchronized with the remote device (services re-discovery will run in background).  
  
    - `msg.type` (*String*): `'DEV_ONLINE'`
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_ONLINE',
        data: '0x78c5e570796e',
    }
    ```

<br />

- **DEV_INCOMING**  

    A peripheral has joined the network and synchronized with the remote.  

    - `msg.type` (*String*): `'DEV_INCOMING'`
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_INCOMING',
        data: '0x78c5e570796e',
    }
    ```

<br />

- **DEV_PAUSE**

    A peripheral has just paused its connection in order to allow other peripheral to join the network. (Due to limitation of the number of connections)  
    
    - `msg.type` (*String*): `'DEV_PAUSE'`
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_PAUSE',
        data: '0x78c5e570796e',
    }
    ```

<br />

- **DEV_LEAVING**  

    A peripheral has just left the network.  

    - `msg.type` (*String*): `'DEV_LEAVING'`
    - `msg.data` (*String*): Device address  

    ```js
    {
        type: 'DEV_LEAVING',
        data: '0x78c5e570796e',
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
        data: 60,
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
            err: [Error: Characteristic: 0xfe00 not register.]
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
> Connect to a remote BLE peripheral. The central will fire an `'IND'` event with message type `'DEV_ONLINE'` when connection is established and will fire an `'IND'` event with message type `'DEV_INCOMING'` when peripheral synchronization accomplished.

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
> Disconnect from the remote BLE peripheral. The central will fire an `'IND'` event with meaasge type `'DEV_LEAVING'` when procedure of disconnecting accomplished.  

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
<a name="API_remove"></a>
###.remove([callback])
> Disconnect from the remote BLE peripheral and remove its record from database. The central will fire an `'IND'` event with meaasge type `'DEV_LEAVING'` when procedure of disconnecting accomplished. 

**Arguments**
- `callack` (*Function*): `function (err) { }`. Get called when connection between central and remote peripheral is disconnected and peripheral record is removed.  

**Returns**
- (*none*)

**Example**
```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_LEAVING')
        console.log(msg);
});

peripheral.remove(function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_updateLinkParam"></a>  
###.updateLinkParam(interval, latency, timeout[, callback])  
> Update link parameters of the peripherial.  

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
> Encrypt the connection between central and peripheral. The central will fire an `'IND'` event along with message type `'PASSKEY_NEED'` if it requires a passkey during encryption procedure for MITM protection.  

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
> Send the passkey required by the encryption procedure.  

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
> Update the `peripheral` instance with latest Characteristic Values reading from the remote device.  

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
<a name="API_read"></a>  
###.read(uuidServ, uuidChar, callback)
> Read the value of an allocated Characteristic from the remote device.  

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
> Write a value to the allocated Characteristic on the remote device.  

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
> Read the description from an allocated Characteristic on the remote device.  

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
> Enable or disable the indication/notification of a Characteristic.  

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
> Register a handler to handle notification or indication of the Characteristic.

**Arguments**
- `servUuid` (*String*): Service uuid  
- `charUuid` (*String*): Characteristic uuid  
- `fn` (*Function*): Handler function  

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

<a name="addDefinition"></a>
### 3.1 How to define your own Services and Characteristics

To let **ble-shepherd** parse and build the packet of your private Services and Characteristics, you should first register the private definitions to **ble-shepherd** by `central.regGattDefs(type, regObjs)` method.  

* `regObjs` contains the registration information depending on which type, Service or Characteristic, you like to register to **ble-shepherd**.  
    * If `type === 'service'`, `regObjs` should be given with an array of the _Service information object_. Each entry in this array should be an object with properties listed in the table:

        | Property | Type     | Mandatory | Description         |
        |----------|----------|-----------|---------------------|
        | uuid     | String   | required  | characteristic uuid |
        | name     | String   | required  | characteristic name |
        (Note: Make sure that your `name` and `uuid` won't conflict with a public Service or a registered Service.)

    * If `type === 'characteristic'`, `regObjs` should be given with an array of the _Characteristic information object_. Each entry in this array should be an object with properties shown in the table:  
    
        | Property | Type   | Mandatory | Description                    |
        |----------|--------|-----------|--------------------------------|
        | uuid     | String | required  | characteristic uuid            |
        | name     | String | required  | characteristic name            |
        | params   | Array  | required  | characteristic parameters      |
        | types    | Array  | required  | characteristic parameters type |
        * `params`: The Characteristic value will be parsed into an object according to the keys given orderly in this array.  
        * `types`: An array to indicate the data type of each entry in `params` array. The order of entries in `types` and `params` array should be exactly matched.  
        
        (Note: Make sure that your `name` and `uuid` won't conflict with a public Characteristic or a registered Characteristic.)

* Example
    * Register service definations
    ```js
    central.regGattDefs('service', [
        { name: 'SimpleKeys', uuid: '0xffe0' },     // 'SimpleKeys' is any string you like to name your Service
        { name: 'Accelerometer', uuid: '0xffa0' }
    ]);
    ```

    * Register characteristic definitions
    ```js
    central.regGattDefs('characteristic', [
        { name: 'KeyPressState', uuid: '0xffe1', params: [ 'Enable' ], types: [ 'uint8' ] }, 
        { name: 'AccelerometerX', uuid: '0xffa3', params: [ 'X' ], types: [ 'uint8' ] }, 
        { name: 'AccelerometerY', uuid: '0xffa4', params: [ 'Y' ], types: [ 'uint8' ] }, 
        { name: 'AccelerometerZ', uuid: '0xffa5', params: [ 'Z' ], types: [ 'uint8' ] }, 
    ]);
    ```

*************************************************
<a name="addService"></a>
### 3.2 How to add your own Services to central

Use `central.addLocalServ(servInfo, callback)` method to create a local Service on the central and register it to CC254X BNP.  
    
* The following table shows the details of each property within `servInfo` object.  

    | Property  | Type   | Mandatory | Description                                          |
    |-----------|--------|-----------|------------------------------------------------------|
    | uuid      | String | required  | service uuid                                         |
    | name      | String | optional  | service name                                         |
    | charsInfo | Array  | required  | including lots of characteristic information objects |

* Each entry in `charsInfo` array should be an object with the following properties:

    | Property | Type             | Mandatory | Description                |
    |----------|------------------|-----------|----------------------------|
    | uuid     | String           | required  | characteristic uuid        |
    | name     | String           | optional  | characteristic name        |
    | permit   | Array            | required  | characteristic permission  |
    | prop     | Array            | required  | characteristic property    |
    | val      | Object or Buffer | required  | characteristic value       |
    | desc     | String           | optional  | characteristic description |

    - Characteristic permission, `permit` accepts: 'Read', 'Write', 'AuthenRead', 'AuthenWrite', 'AuthorRead', 'AuthorWrite', or 'EncryptRead', 'EncryptWrite'
    - Characteristic property, `prop` accepts: 'Broadcast', 'Read', 'WriteWithoutResponse', 'Write', 'Notify', or 'Indicate', 'AuthenticatedSignedWrites', 'ExtendedProperties'

* Differences between **prop** and **permit**  
    - Each Characteristic has a lot of attributes, including Characteristic value and many optional information about the value, such as _Characteristic User Description_.
        - `permit`: Each attribute in a Characteristic has its own permission, and `permit` is used to define permission of the Characteristic Value, i.e., access permission, encryption, authorization.  
        - `prop`: `prop` is an attribute in a Characteristic to describe permission of accessing the Characteristic Value. Having a read permission can let GATT clients know what operations they can perform upon the Characteristic Value.  
        
    Note: `prop` must be compatible with `permit`, otherwise GATT clients will be misled.  

* Example
    * Add Characteristics into a public Service
        - If the Characteristic is a public-defined one, `val` in charInfo should be an object with keys listed in column _Field Names_ of [public UUID table](https://github.com/hedywings/cc-bnp#323-characteristics).  
    ```js
    var charsInfo = [
        { uuid: '0x2a00', permit: [ 'Read' ], prop: [ 'Read' ], val: { name: "BLE Shepherd" } },
        { uuid: '0x2a28', permit: [ 'Read' ], prop: [ 'Read' ], val: { softwareRev: '0.0.1' } },
        { uuid: '0x2a29', permit: [ 'Read '], prop: [ 'Read '], val: { manufacturerName: 'sivann' } }
    ],
    servInfo = {
        uuid: '0x1800',
        charsInfo : charsInfo
    };

    central.addLocalServ(servInfo, function (err, service) {
        if (err)
            console.log(err);
        else
            console.log(service);
    });
    ```

    * Add Characteristics into a private Service 
        - If the Characteristic is not a public-defined one, you should register its definition to **ble-shepherd**[(see section "How to define your own Services and Characteristics")](#addDefinition). You can also parse/build raw packet of a Characteristic Value on your own without registering your private definitions.  

    ```js
    // if Characteristic definition is not registered, type of a Characteristic Value must be a buffer
    var charsInfo = [
        { uuid: 'aa11', name: 'data', permit: [ 'Read' ], prop: [ 'Read' ], val: new Buffer([ 10, 20, 30 ) },
        { uuid: 'aa12', name: 'config', permit: [ 'Write' ], prop: [ 'Write' ], val: new Buffer([ 1 ]) },
        { uuid: 'aa13', name: 'period', permit: [ 'Write '], prop: [ 'Write '], val: new Buffer([ 100 ]) }
    ],
    servInfo = {
        uuid: '0xaa10',
        name: 'Accelerometer'
        charsInfo : charsInfo
    };

    central.addLocalServ(servInfo, function (err, service) {
        if (err)
            console.log(err);
        else
            console.log(service);
    });

    // if Characteristic definition is registered, Characteristic Value should be an object with keys according to `params` you've registered  
    var charsInfo = [
        { uuid: '0xaa11', name: 'data', permit: [ 'Read' ], prop: [ 'Read' ], val: { x: 10, y: 10, z: 10 } },
        { uuid: '0xaa12', name: 'config', permit: [ 'Write' ], prop: [ 'Write' ], val: { range: 1 } },
        { uuid: '0xaa13', name: 'period', permit: [ 'Write '], prop: [ 'Write '], val: { period: 100 } }
    ],
    servInfo = {
        uuid: '0xaa10',
        name: 'Accelerometer'
        charsInfo : charsInfo
    };

    central.regGattDefs('characteristic', [
        { name: 'data', uuid: '0xaa11', params: [ 'x', 'y', 'z' ], types: [ 'uint8', 'uint8', 'uint8' ] }, 
        { name: 'config', uuid: '0xaa12', params: [ 'range' ], types: [ 'uint8' ] }, 
        { name: 'period', uuid: '0xaa13', params: [ 'period' ], types: [ 'uint8' ] }
    ]);

    central.addLocalServ(servInfo, function (err, service) {
        if (err)
            console.log(err);
        else
            console.log(service);
    });
    ```

*************************************************

<br />

<a name="Demo"></a>
## 4. Demo  

With **ble-shepherd**, it is easy and quick to implement BLE IoT apps as well as manage your BLE peripherals.  

**ble-shepherd** works well with web frameworks like [ExpressJS](#http://expressjs.com/), it's very convenient for developers to build their own RESTful services or to build graphic user interfaces for displaying device information, monitoring sensing data, and operating peripherals.  

Here is a simple ble-shepherd webapp built up with ExpressJS and [socket.io](#http://socket.io/). ExpressJS provides web sevices and socket.io passes messages back and forth between the web client and server, especially passes those asynchronous indications from remote devices to web client to avoid regularly polling.  

This demo uses a CSR8510 BLE USB dongle with 5 simultaneous connections. A polling mechanism is required if you want to connect to peripherals more than 5. The following four steps guides you through the implementation of this demo.  

- [Run the webapp with ble-shepherd](#runServer)  
- [Deal with device online and offline status](#devOnlineOffline)  
- [Deal with characteristic notifications](#charNotif)  
- [Control devices on the webapp GUI](#ctrlDev)  

Note: A preliminary understanding of socket.io and ExpressJS is required.  
  
![ble-shepherd webapp](https://raw.githubusercontent.com/hedywings/ble-shepherd/develop/documents/bShepherdWeb.png)

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
    central = require('ble-shepherd')('noble');

var connFlag = true,
    bleSocket;

exports.initialize = function(server) {
    // Express server run with socket.io 
    io = io(server);

    io.on('connection', function (socket) {
        bleSocket = socket;
        
        if (connFlag) {
            // start running ble-shepherd
            central.start(bleApp);
            connFlag = false;
        }

        // listening 'req' event from client-side
        socket.on('cmd', clientCmdHdlr);
    });
};

// bleApp listens all types of 'IND' event emitted by ble-shepherd, 
// and assign the corresponding handler for those event.
function bleApp () {
    central.on('IND', indicationHdlr);
}
```
  
*************************************************
<a name="devOnlineOffline"></a>
### 4.2 Deal with device online and offline status

Let's deal with the received [`'IND'` events](#EVT_ind) in our app. This demo only shows how to tackle types of the `'DEV_INCOMING'` and `'DEV_LEAVING'` indcations. Here is the example:  

```js
// bleSocket.js

function indicationHdlr (msg) {
    var dev;

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(msg.data);   // msg.data is the device address
            if (dev)
                devIncomingHdlr(dev);       // dispatch to device incoming handler
            break;

        case 'DEV_LEAVING':
            dev = central.find(msg.data);   // msg.data is the device address
            if (dev)
                devLeavingHdlr(dev);        // dispatch to device leaving handler
            break;
    }
}
```

- When received an indication of `'DEV_INCOMING'` type, check what kind of the device is and register handlers to tackle the characteristic changes. Then, broadcast the `'bleInd'` event along with a `'devIncoming'` type of indication to tell all web clients that a device has joined the network.  

    - Here is an example, assume that a device with an address of '0x9059af0b8159' joins the network. We can register handlers corresponding to each characteristic notification, and enable those characteristics to start notifying their changes.  

    ```js
    // bleSocket.js

    function devIncomingHdlr(dev) {
        var emitFlag = true,
            devName = dev.findChar('0x1800', '0x2a00').val.name,
            newDev;
    
        // This demo uses device name to identify "_what a device is_".  
        // You can identify a device by its services, manufacturer name, 
        // product id, or something you tagged in the remote device.  

        switch (devName) {
            case 'TI BLE Sensor Tag':
                sensorTag = dev;
                // register characteristics handler
                // signature: regCharHdlr(uuidServ, uuidChar, fn)
                sensorTag.regCharHdlr('0xaa00', '0xaa01', tempCharHdlr);
                sensorTag.regCharHdlr('0xaa10', '0xaa11', accelerometerCharHdlr);
                sensorTag.regCharHdlr('0xaa20', '0xaa21', humidCharHdlr);
                sensorTag.regCharHdlr('0xffe0', '0xffe1', simpleKeyCharHdlr);
    
                // enable characteristics notification
                // signature: setNotify(uuidServ, uuidChar, config[, callback])
                sensorTag.setNotify('0xffe0', '0xffe1', true);
                sensorTag.setNotify('0xaa00', '0xaa01', true);
                sensorTag.setNotify('0xaa10', '0xaa11', true);
                sensorTag.setNotify('0xaa20', '0xaa21', true);
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

                dev.remove();
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
- When received an indication of `'DEV_LEAVING'` type, broadcast the `'bleInd'` event with a `'devLeaving'` type of indication to tell all web clients that a device has left the network.  

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
            data: msg.data
        });
    }
```

*************************************************
<a name="charNotif"></a>
### 4.3 Deal with characteristic notifications

Register a handler via regCharHdlr() to help you with tackling the notification of a particular characteristic. You can do anything upon receiving the characteristic notification in the handler, such as collecting data for further analysis or pushing data to cloud.  
  
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
