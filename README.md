#ble-shepherd
<br />

## Table of Contents

* [Overiew](#Overiew)    
* [Features](#Features) 
* [Installation](#Installation) 
* [Usage](#Usage)
* [APIs and Events](#APIs) 
* [Advanced topics](#Advanced)
    * [How to define your own Service and Characteristic](#addDefinition)
    * [How to add Services to central](#addService)
* [Demo](#Demo)
    * [Running the server with ble-shepherd](#runServer)
    * [Processing device online and offline](#devOnlineOffline)
    * [Process characteristic notification](#charNotif)
    * [Control the device via website](#ctrlDev)
* [Example](#Example)
* [License](#License)

<br />
<a name="Overiew"></a>
##Overview
**ble-shepherd** is a BLE network controller running on node.js. It is an extension of BLE *central* device that aims to help you in building a BLE machine network with less effort.  
  
**ble-shepherd** has all the features you need in controlling your BLE network, monitoring and operating the BLE *pheripheral* devices. Many essentials of network management has been done by this controller, e.g., auto scanning for *pheripheral* devices, storing connected devices records to and reloading them from the built-in database, configuring connection parameters, and notifying online/offline status of devices with auto reconnection.  

With **ble-shepherd**, you can get rid of such networking things and focus on your application logics. It is easy to set and receive notifications from remote *peripherals*. Furthermore, reading resources from and writing values to *periphrals* is also a simple task, here is an example:

``` js
peripheral.read('0x1800', '0x2a00', functional (err, value) {
    // value is remotely read from the peripheral device
});
peripheral.write('0x1800', '0x2a02', { Flag: false }, functional (err) {
    // value is remotely write to the peripheral device
});
```

**ble-shepherd** opens another way of implementing IoT applications with BLE devices. With node.js, you can build your own application console and design your own RESTful APIs in seconds. It is easy to make your BLE devices happy onto the cloud.  
  
**Note**:  
At this moment, **ble-shepherd** is built on top of [cc-bnp](https://github.com/hedywings/ccBnp) and [noble]() libraries. They are targeting on TI [CC254X BLE Network Processor](http://processors.wiki.ti.com/index.php/CC254X_WITH_EXT_MCU#Network_Processor) and CSR8510 BLE4.0 USB Adapter, respectively. This project may support TI [CC264X](http://processors.wiki.ti.com/index.php/CC2640_BLE_Network_Processor) BLE Network Processor in the near future (if I can get the development tools). Please let me know if you have any suggestions about the BLE SoC solutions.  

<br />
<a name="Features"></a>
##Features

- Building your machine network with BLE devices.  
- Controlling the network with no pain, i.e., auto reconnection, permission of device joining, built-in database and many more.  
- Creating BLE IoT apps is simple and quick.  
- Allows you to define _Services_ and _Characteritics_ on **ble-shepherd** itself to make it a BLE gadget. **ble-shepherd** not just plays as a network controller.  
- Based-on node.js. It's easy to integrate BLE apps with other services or font-end frameworks, e.g., http server, express, React.js, Angular.js.

<br />
<a name="Installation"></a>
##Installation
Available via [npm](http://npmjs.org/package/ble-shepherd): 
> $ npm install ble-shepherd --save

<br />
<a name="Usage"></a>
## Usage
**ble-shepherd** exports its functionalities as a singleton denoted as `central` in this document. The following example shows how to create an application by **ble-shepherd** with CC254X network processor. Fisrtly, set up your serial-port configuration to connect to CC254X network processor(BNP). Next, bring the central up by calling the method `start()` with your configuration `spCfg` and application function `app`. The application is an callback that will run after the success of serial connection to BNP. In addition, you can override the method `appInit()` if you like to tackle something prior to the loading of your app, e.g., registering custom GATT definitions. 

**Note**: 
ble-shepherd now support CC254x network processor and CSR8510 USB dongle, so you need to fill in `cc254x` or `csr8510` when require ble-shepherd module to specify the chip that you are using now.
  
```javascript
var central = require('ble-shepherd')('cc254x');
var spCfg = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

central.start(app, spCfg);

function app() {
    // your application
}

central.appInit = function () {
    // do something before start application
    // usually register GATT definition by calling regGattDefs() here
}
```

<br />
<a name="APIs"></a>
## APIs and Events

####1. Control the Network 
>**central** is a singleton exported by `require('ble-shepherd')(chipName)`, chipName is used to specify the chip that you are using, we support `cc254x` and `csr8510` now.

* [central.start()](#API_start)
* [central.setNwkParams()](#API_setNwkParams)
* [central.permitJoin()](#API_permitJoin)
* [central.command()](#API_command)
* [central.find()](#API_find)
* [central.regGattDefs()](#API_regGattDefs)
* [central.addLocalServ()](#API_addLocalServ)
* ['IND' event](#EVT_ind)

####2. Monitor and Control the Peripherals
>**peripheral** is a software endpoint that represents the remote BLE device. The connected _pheripheral_ device can be found by `central.find()`.

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

The following table shows the support of ble-shepherd APIs on different SoC.

| Interface                             | API               | CC254x BNP      |  CSR8510 dongle |
| --------------------------------------| ------------------| --------------- | --------------- |
| Control the Network                   | start             | V               | V               |
|                                       | setNwkParams      | V               | V               |
|                                       | permitJoin        | V               | V               |
|                                       | command           | V               | X               |
|                                       | find              | V               | V               |
|                                       | regGattDefs       | V               | V               |
|                                       | addLocalServ      | V               | X               |
| Monitor and Control the Peripherals   | connect           | V               | V               |
|                                       | disconnect        | V               | V               |
|                                       | remove            | V               | V               |
|                                       | updateLinkParam   | V               | V               |     
|                                       | encrypt           | V               | X               |
|                                       | passPasskey       | V               | X               |
|                                       | readDesc          | V               | V               |
|                                       | setNotify         | V               | V               |
|                                       | update            | V               | V               |
|                                       | read              | V               | V               |
|                                       | write             | V               | V               |
|                                       | regCharHdlr       | V               | V               |

<br />
*************************************************
## BleShepherd Class  
`require('ble-shepherd')(chipName)` exports the singleton of this class. This singleton is denoted as `central` in this document.  
<br />

<a name="API_start"></a>  
### .start(app, spCfg)  
> Connects to the SoC and starts to run the app.  

**Arguments**  

1. `app` (*Function*): The application function that will be called after initialization completes. 
2. `spCfg` (*Object*): This value-object has two properties `path` and `options` for configuring the serial port.  
    - `path`: a string that refers to the system path of the serial port, e.g., `'/dev/ttyUSB0'`  
    - `options`: an object for setting up the [seiralport](https://www.npmjs.com/package/serialport#to-use). The default value of `options` is shown in the following example.   

Note: You do not need to fill `spCfg` field if you are using CSR8510 SoC.

**Returns**  

- (*Object*): central  

**Example**  

using CC254X SoC
```javascript
var central = require('ble-shepherd')('cc254x');
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
    //your application
};

central.start(app, spCfg);
```

using CSR8510 SoC
```javascript
var central = require('ble-shepherd')('csr8510');
var app;

app = function () {
    //your application
};

central.start(app);
```

*************************************************
<a name="API_setNwkParams"></a>  
###.setNwkParams(type, setting[, callback])  
> Set up network parameters of the BLE central.  

**Arguments**  

1. `type` (*String*): The type can be `'scan'` or `'link'`. It is used to indicate which type of parameter will be set.  
2. `setting` (*Object*): The following table shows the object according to the given `type`.  
    - When `type === 'scan'`  
    
    | Property | Type | Mandatory | Description | Default value |
    |------------|------------|------------|------------|------------|
    | interval | Number | optional | Scan interval(mSec) | 0x0010 |
    | window | Number | optional | Scan window(mSec) | 0x0010 |

    - When `type === 'link'`
    
    | Property | Type | Mandatory | Description | Default value |
    |------------|------------|------------|------------|------------|
    | interval | Number | optional | Connection interval(mSec) | 0x0018 |
    | latency | Number | optional | Connection slave latency(mSec) | 0x0000 |
    | timeout | Number | optional | Connection supervision timeout(mSec) | 0x00c8 |

- `callback` (*Function*): `function (err) { }`. Get called when parameters are set.  

Note: Property `interval` of the link parameter affects the transmission rate of the connection.  

**Returns**  

- (*none*)  

**Example**  

```javascript
// setting scan parameter
central.setNwkParams('scan', { interval: 16, window: 16 }, function (err) {
    if (err)
        console.log(err);
});

// setting link parameter
central.setNwkParams('link', { interval: 10240, latency: 0, timeout: 1000 }, function (err) {
    if (err)
        console.log(err);
});

// just setting interval property of link parameter
central.setNwkParams('link', { interval: 5000 }, function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_permitJoin"></a>  
###.permitJoin(time)  
> Open for devices to join the network.

**Arguments**  

1. `time` (*Number*): Interval in seconds for central openning for devices to join the network. Set time to 0 can immediately close the admission.

**Returns**  

- (*Object*): central  

**Example**  

```javascript
//permit devices to join for 60 seconds 
central.permitJoin(60);
```

*************************************************
<a name="API_command"></a>  
###.command(subGroup, cmd, argInst, callback)  
> Calling TI BLE Vendor-Specific HCI Command, please refer to the sections [Calling the TI BLE Vendor-Specific HCI Command APIs](https://github.com/hedywings/ccBnp#calling-the-ti-ble-vendor-specific-hci-command-apis) and [Vendor-Specific HCI Command Reference Tables](https://github.com/hedywings/ccBnp#vendor-specific-hci-command-reference-tables) in ccBnp document for details.

Note: This command only supports CC254X SoC

**Arguments**  

1. `subGroup` (*String*): Sub-group name. It can be `hci`, `l2cap`, `att`, `gatt`, `gap`, or `util`.  
2. `cmd` (*String*): Function name of Vendor-Specific HCI Command API. You can find the function name from the column **ccBnp Cmd-API** in this [table](https://github.com/hedywings/ccBnp#vendor-specific-hci-command-reference-tables).  
3. `args` (_Object_): An argument object passing to the command. The keys of this value-object should be named according to the column **Arguments** in this [table](https://github.com/hedywings/ccBnp#vendor-specific-hci-command-reference-tables).  
4. `callback` (*Function*): `function (err, result) {}`. Get called with the result of execution.

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
<a name="API_find"></a>  
###.find(addrOrHdl)  
> Find the peripheral that maintained by central.  

**Arguments**  

1. `addrOrHdl` (*String* | *Number*): The address or connection handle of a peripheral.

**Returns**  

- (*Object*): peripheral, an instance of the BlePeripheral class  

**Example**  

```javascript
// using address
var peripheral = central.find('0x78c5e570796e');

// using connection handle
var peripheral = central.find(0);
```

*************************************************
<a name="API_regGattDefs"></a>  
###.regGattDefs(type, regObjs)  
> The method allows you to register your private Services or Characteristic definitions.  

**Arguments**  

1. `type` (*String*): The type of definition to register. It can be `'service'` or `'characteristic'`.  
2. `regObjs` (*Array*): It should be given with an array of the _Service information object_ or _Characteristic information object_.  

Note: You can see more detail in [How to define your own Service and Characteristic](#addDefinition) of Advanced topics section.

**Returns**  

- (*Object*): central   
  
**Example**  
  
```javascript
// register service definition
central.regGattDefs('service', [
    { name: 'SimpleKeys', uuid: '0xffe0' },
    { name: 'Accelerometer', uuid: '0xffa0' }
]);

// register characteristic definition
central.regGattDefs('characteristic', [
    { name: 'KeyPressState', uuid: '0xffe1', params: [ 'Enable' ], types: [ 'uint8' ] }, 
    { name: 'AccelerometerX', uuid: '0xffa3', params: [ 'X' ], types: [ 'uint8' ] }, 
    { name: 'AccelerometerY', uuid: '0xffa4', params: [ 'Y' ], types: [ 'uint8' ] }, 
    { name: 'AccelerometerZ', uuid: '0xffa5', params: [ 'Z' ], types: [ 'uint8' ] }, 
]);
```
  
*************************************************
<a name="API_addLocalServ"></a>  
### .addLocalServ(servInfo[, callback])  
> Register a Service to the BLE central.  
 
Note: This command only supports CC254X SoC.

**Arguments**  

1. `servInfo` (*Object*): This is an object that contains properties of `uuid`, `name` and `charsInfo` to describe the information about the Service.

2. `callback` (*Function*) : `function (err, service) {}`, Get called when service register to BNP success. 

Note: You can see more detail in [How to add Services to central](#addService) of Advanced topics section. 

**Returns**  

- (*none*)  

**Example**  

```javascript
// Step1: prepare characteristic information
var charsInfo = [
        { uuid: '0x2a00', permit: [ 'Read' ], prop: [ 'Read' ], val: { name: "BLE Shepherd" } },
        { uuid: '0x2a28', permit: [ 'Read' ], prop: [ 'Read' ], val: { softwareRev: '0.0.1' } },
        { uuid: '0x2a29', permit: [ 'Read '], prop: [ 'Read '], val: { manufacturerName: 'sivann' } }
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
Event Handler: `function(msg) { }`  

The central will fire an `IND` event upon receiving an indication from a peripheral. An incoming message will be typed in `msg.type` with either one of `DEV_ONLINE`, `DEV_INCOMING`, `DEV_LEAVING`, `PASSKEY_NEED` and `LOCAL_SERV_ERR` according to its purpose.

- **DEV_ONLINE**
    A peripheral join the network.

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
    A peripheral join the network and the procedure of synchronize peripheral information is complete.

    - `msg.type` (*String*): `'DEV_INCOMING'`
    - `msg.data` (*String*): Device address  
    ```js
    {
        type: 'DEV_INCOMING',
        data: '0x78c5e570796e',
    }
    ```
<br />
- **DEV_LEAVING**  
    A peripheral leave the network.

    - `msg.type` (*String*): `'DEV_LEAVING'`
    - `msg.data` (*String*): Device address  
    ```js
    {
        type: 'DEV_LEAVING',
        data: '0x78c5e570796e',
    }
    ```
<br />
- **PASSKEY_NEED**  
    The encryption process of connection requires a passkey. This event only support CC254X SoC.

    - `msg.type` (*String*): `'PASSKEY_NEED'`
    - `msg.data` (*Object*): This object has fileds of `devAddr`, `connHandle`, `uiInput`, and `uiOutput`.  
    ```js
    { 
        type: 'PASSKEY_NEED', 
        data: {
            devAddr: '0x78c5e570796e',
            connHandle: 0,
            uiInput: 1,
            uiOutput: 0 
        }
    }
    ```
<br />
- **LOCAL_SERV_ERR**  
    An error occurs while processing an incoming peripheral ATT event. This event only support CC254X SoC.

    - `msg.type` (*String*): `'LOCAL_SERV_ERR'`
    - `msg.data` (*Object*): This object has fileds of `evtData` and `err`. `evtData` is a request message emit from remote peripheral, `err` is an error object describing the reason of why the request could not be processed.
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
            err: new Error('Characteristic: 0xfe00 not register.')
        }
    }
    ```
<br />

***********************************************
<br />  
## BlePeripheral Class  
`central.find(addrOrHdl)` return the instance of this class. This instance is denoted as `peripheral` in this document.

<br />
*************************************************
<a name="API_connect"></a>
###.connect([callback])
> Connect to the remote BLE peripheral. Central will fire a `IND` event with message type `DEV_ONLINE` when connection is established and fire a `IND` event with message type `DEV_INCOMING` when the procedure of synchronize peripheral information is finished.

**Arguments**
- `callback` (*Function*): `function (err) {}`. Get called when the connection between central and remote peripheral is established.

**Returns**
- (*none*)

**Example**
```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_ONLINE') {
        console.log(msg);
    }
});

central.on('IND', function (msg) {
    if (msg.type === 'DEV_INCOMING') {
        console.log(msg);
    }
});

peripheral.connect(function (err) {
    if (err) {
        console.log(err);
    }
});
```

*************************************************
<a name="API_disconnect"></a>
###.disconnect([callback])
> Disconnect to the remote BLE peripheral. Central will fire a `IND` event with meaasge type `DEV_LEAVING` when the procedure of disconnecting is completed. 

**Arguments**
- `callack` (*Function*): `function (err) {}`. Get called when the connection between central and remote peripheral is disconnected.

**Returns**
- (*none*)

**Example**
```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_LEAVING') {
        console.log(msg);
    }
});

peripheral.disconnect(function (err) {
    if (err) {
        console.log(err);
    }
});
```

*************************************************
<a name="API_remove"></a>
###.remove([callback])
> Disconnect to the remote BLE peripheral and remove peripheral record from database. Central will fire a `IND` event with meaasge type `DEV_LEAVING` when the procedure of disconnecting is completed. 

**Arguments**
- `callack` (*Function*): `function (err) {}`. Get called when the connection between central and remote peripheral is disconnected and peripheral record is removed.

**Returns**
- (*none*)

**Example**
```javascript
central.on('IND', function (msg) {
    if (msg.type === 'DEV_LEAVING') {
        console.log(msg);
    }
});

peripheral.remove(function (err) {
    if (err) {
        console.log(err);
    }
});
```

*************************************************
<a name="API_updateLinkParam"></a>  
###.updateLinkParam(interval, latency, timeout[, callback])  
> Update link parameters of the peripherial.  

**Arguments**  

1. `interval` (*Number*): Connection interval.  
2. `latency` (*Number*): Slave latency.  
3. `timeout` (*Number*): Connection supervision timeout.  
4. `callback` (*Function*): `function (err) { }`. Get called when parameters are setting complete.  

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
> Encrypt the connection between the central and peripheral. Central will fire an `IND` event along with a message typed as `PASSKEY_NEED` if it requires a passkey during the encryption procedure for MITM protection.  

Note: This command only supports CC254X SoC.

**Arguments**  

1. `setting` (*Object*): Peripheral security setting. The following table shows the details of each property.  
2. `callback` (*Function*): `function (err) { }`. Get called when encryption completes.  

| Property | Type | Mandatory | Description | Default value |
|----------|----------|----------|----------|----------|
| pairMode | Number | Optional | pairing mode | 0x01 |
| ioCap | Number | Optional | io capabilities | 0x04 |
| mitm | Boolean | Optional | MITM protection | true |
| bond | Boolean | Optional | bonding enable | true |

Note: Please refer to the document [TI BLE Vendor Specific HCI Guide.pdf (P77)](https://github.com/hedywings/ccBnp/raw/master/documents/TI_BLE_Vendor_Specific_HCI_Guide.pdf) for the description of `pairMode` and `ioCap`.  

**Returns**  

- (*none*)  

**Example**  

```javascript
var setting = {
    pairMode: 0x01, //WaitForReq
    ioCap: 0x04,    //KeyboardDisplay
    mitm: true,
    bond: true
}

central.on('IND', function (msg) {
    if (msg.type === 'PASSKEY_NEED') {
        //finding the peripheral and send passkey by calling passPasskey() here
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

Note: This command only supports CC254X SoC.

**Arguments**  

1. `passkey` (*Number*): 6 character ASCII string of numbers (ex. '019655')
2. `callback` (*Function*): `function (err) { }`. Get called when passkey transmit to the remote peripheral success.  

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
> Remotely read all characteristics value from the peripheral device to update peripheral instance on the central.

**Arguments**  

1. `callback`(*Function*): `function (err) { }`. Get called when updating complete.

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
> Remotely read a value from the allocated Characteristic.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `callback` (*Function*): `function (err, value) { }`. Get called along with a read value when the reading completes.  

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
> Remotely write a value to the allocated Characteristic.  

**Arguments**  

1. `uuidServ` (*String*): Service uuid.  
2. `uuidChar` (*String*): Characteristic uuid.  
3. `value` (*Object* | *Buffer*): Characteristic value. If the Characteristic is not a public one or is not registered by calling `central.regGattDefs()`, characteristic value must be a buffer.  
4. `callback` (*Function*): `function (err) { }`. Get called when the writing completes.  

**Returns**  

- (*none*)  

**Example**  

```javascript
//characteristic is public
peripheral.write('0x1800', '0x2a02', { Flag: true }, function (err) {
    if (err)
        console.log(err);
});

//characteristic is private and not register its definition
peripheral.write('0xfff0', '0xfff3', new Buffer([ 1 ]), function (err) {
    if (err)
        console.log(err);
});
```

*************************************************
<a name="API_readDesc"></a>  
###.readDesc(uuidServ, uuidChar, callback)  
> Remotely read the description from the allocated Characteristic.  

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
3. `config` (*Boolean*): `true` to enable and `false` to disable the indication/notification of characteristic. 
4. `callback` (*Function*): `function (err) { }`. Get called when the configuration sets up.  

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
> Register handler to handle notification or indication of characteristic.

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

<br />
<a name="Advanced"></a>
## Advanced topics

<a name="addDefinition"></a>
###How to define your own Service and Characteristic
Use the `central.regGattDefs(type, regObjs)` method to register private service or characteristic definations. Register private characteristic defination can helps you parse and build characteristic value.

* `regObjs` format will vary according to the register type
    * If `type === 'service'`, `regObjs` should be given with an array of the _Service information object_ having the following properties.

        | Property | Type | Mandatory | Description |
        |----------|----------|----------|----------|
        | uuid | String | required | characteristic uuid |
        | name | String | required | characteristic name |
        (Note: Neither name nor uuid conflict with a public Service or a registered Service.)

    * If `type === 'characteristic'`, `regObjs` should be given with an array of the _Characteristic information object_ having the following properties. 
    
        | Property | Type | Mandatory | Description |
        |----------|----------|----------|----------|
        | uuid | String | required | characteristic uuid |
        | name | String | required | characteristic name |
        | params | Array | required | characteristic parameters |
        | types | Array | required | characteristic parameters type |
        * `params`: The Characteristic value will be parsed into an object with keys given in this array. The built-in parser will parse the payload according to the given keys in order.
        * `types`: An array used to type each data in the params array. The order of entries in types and params array should be exactly matched.
        
        (Note: Neither name nor uuid conflict with a public Characteristic or a registered Characteristic.)

* Example
    * Register service definations
    ```js
    central.regGattDefs('service', [
        { name: 'SimpleKeys', uuid: '0xffe0' },
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
###How to add services to central
Use the `central.addLocalServ(servInfo, callback)` method to create a local service to the central and register to the CC254X BNP. 
    
* The following table shows the details of each property within `servInfo`.

    | Property | Type | Mandatory | Description |
    |----------|----------|----------|----------|
    | uuid | String | required | service uuid |
    | name | String | optional | service name |
    | charsInfo | Array | required | including lots of characteristic information objects |

* Each entry in `charsInfo` array should be an object having the following preoperties:

    | Property | Type | Mandatory | Description |
    |----------|----------|----------|----------|
    | uuid | String | required | characteristic uuid |
    | name | String | optional | characteristic name |
    | permit | Array | required | characteristic permission |
    | prop | Array | required | characteristic property |
    | val | Object or Buffer | required | characteristic value |
    | desc | String | optional | characteristic description |
    - Allowed Characteristic property: 'Broadcast', 'Read', 'WriteWithoutResponse', 'Write', 'Notify', 'Indicate', 'AuthenticatedSignedWrites', 'ExtendedProperties'
    - Allowed Characteristic permission: 'Read', 'Write', 'AuthenRead', 'AuthenWrite', 'AuthorRead', 'AuthorWrite', 'EncryptRead', 'EncryptWrite'

* Differences between Prop and Permit
    - Each characteristic have lots of attributes, including characteristic value and many option information about the value, such as Characteristic User Description.
        - `permit`: Each attribute of characteristic has its own permission, `permit` parameter used to define the permission of characteristic value attribute
        - `prop`: `prop` parameter is a attribute of characteristic which is used to describe the permission of characteristic value, it has read permission to let all GATT clients know they can do what operation on characteristic value.
        
    Note: `prop` must be compatible with `permit`, otherwise GATT clients will be misled.

* Example
    * Add public service, if characteristic is public , property `val` of charInfo object must ba an object and format must follow [public characteristic definition](https://github.com/hedywings/ccBnp#3characteristics) of ccBnp.
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

    * Add private service, if characteristic is not a public one, you need to register characteristic definition by refer to the section [How to define your own Service and Characteristic](#addDefinition), or you will need to process raw buffer of characteristic value by yourself.

    ```js
    // if characteristic definition is not registered, type of characteristic value must be buffer
    var charsInfo = [
        { uuid: 'aa11', name: 'data', permit: [ 'Read' ], prop: [ 'Read' ], val: new Buffer([10, 20, 30]) },
        { uuid: 'aa12', name: 'config', permit: [ 'Write' ], prop: [ 'Write' ], val: new Buffer([1]) },
        { uuid: 'aa13', name: 'period', permit: [ 'Write '], prop: [ 'Write '], val: new Buffer([100]) }
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

    // if characteristic definition is registered, type of characteristic value must be object and follow the format you have registered 
    var charsInfo = [
        { uuid: '0xaa11', name: 'data', permit: [ 'Read' ], prop: [ 'Read' ], val: {x: 10, y: 10, z: 10} },
        { uuid: '0xaa12', name: 'config', permit: [ 'Write' ], prop: [ 'Write' ], val: {range: 1} },
        { uuid: '0xaa13', name: 'period', permit: [ 'Write '], prop: [ 'Write '], val: {period: 100} }
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

<br />
<a name="Demo"></a>
##Demo
Through ble-shepherd, a network of BLE peripheral devices can be easily organized, and it can be quick and easy to implement many IoT applications based on ble-shepherd. Of course, ble-shepherd can be integrated with other font-end frameworks, such as ExpressJS, to display the device information, monitor sensing data, and operate peripheral devices via web pages and web applications.

The following figure shows a simple ble-shepherd demo web page which is created by the [ExpressJS](#http://expressjs.com/), and [socket.io](#http://socket.io/) is used to communicate between the client side and the server side. This demo is developed based on CSR8510 BLE USB dongle, and the maximum number of connections of CC254X chipset is 5. If you want to connect more peripherals, the implementation of a polling mechanism is required. The following four steps will guide you through the implementation of ble-shepherd demo.
- Running the server with ble-shepherd
- Processing device online and offline states
- Processing characteristic notifications
- Controlling devices via a web page

![ble-shepherd web](https://raw.githubusercontent.com/hedywings/ble-shepherd/develop/documents/bShepherdWeb.png)

Note: A preliminary understanding of socket.io and ExpressJS is required.

*************************************************
<a name="runServer"></a>
#### 1. Running the server with ble-shepherd
First, a server is created by ExpressJS in app.js and a module named bleSocket.js is established. The bleSocket.js module is responsible for passing the server to socket.io to perform bidirectional communication with the client and running the ble-shepherd. ble-shepherd events can now be emitted to the client-side via the socket and listened from the client-side. The sample code is as following,

```js 
// app.js

var bleSockets = require('./routes/bleSocket');

app.set('port', process.env.PORT || 3000);
server = app.listen(app.get('port'));

bleSockets.initialize(server);
```

```js
// bleSocket.js

var io = require('socket.io'),
    central = require('ble-shepherd')('csr8510');

var connFlag = true,
    bleSocket;

exports.initialize = function(server) {
    // Express server run with socket.io 
    io = io(server);

    io.on('connection', function (socket) {
        bleSocket = socket;
        
        if (connFlag) {
            //start running ble-shepherd
            central.start(bleApp);
            connFlag = false;
        }

        //listening 'req' event from client-side
        socket.on('req', socketReqHdlr);
    });
};

// bleApp listening all types of 'IND' event emitted by ble-shepherd, and assign the corresponding handler for those event.
function bleApp () {
    central.on('IND', manaIndHdlr);
}
```

*************************************************
<a name="devOnlineOffline"></a>
#### 2. Processing device online and offline states
Different types of [`'IND'` events](#EVT_ind) can be received and processed in one's applications, in this demo, we only process `'IND'` events with `'DEV_INCOMING'` and `'DEV_LEAVING'` types. The sample code is as following,
```js
// bleSocket.js

function manaIndHdlr (msg) {
    var dev;

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(msg.data);
            if (dev) { processDevIncome(dev); }
            break;
        case 'DEV_LEAVING':
            dev = central.find(msg.data);
            if (dev) {
                dev.state = 'offline';
                io.sockets.emit('rsp', {type: 'devLeaving', data: msg.data});
            }
            break;
    }
}
```
- When the `'DEV_INCOMING'` type event is received, different processes based on different devices are performed, and then the socket broadcasts the 'rsp' event with the 'devIncoming' type to inform all clients that certain devices have joined the network.
    - For example, when a device with an address of 0x9059af0b8159 joins the network, handlers are registered to handle characteristics notification, and notification of those characteristics are enabled.
    ```js
    // bleSocket.js

    function processDevIncome (dev) {
        var emitFlag = true,
            newDev;
    
        switch (dev.addr) {
            case '0x9059af0b8159':
                sensorTag = dev;
                // register characteristics handler
                sensorTag.regCharHdlr('0xaa00', '0xaa01', callbackTemp);
                sensorTag.regCharHdlr('0xaa10', '0xaa11', callbackAccelerometer);
                sensorTag.regCharHdlr('0xaa20', '0xaa21', callbackHumid);
                sensorTag.regCharHdlr('0xffe0', '0xffe1', callbackSimpleKey);
    
                // enable characteristics notification
                sensorTag.setNotify('0xffe0', '0xffe1', true);
                sensorTag.setNotify('0xaa00', '0xaa01', true);
                sensorTag.setNotify('0xaa10', '0xaa11', true);
                sensorTag.setNotify('0xaa20', '0xaa21', true);
                break;
            case '0x00188c37b65c':
                // ...
                break;
            case '0x544a165e1f53':
                // ...
                break;
            // ...
            default:
                // if the device is not required for application, then remove immediately.
                dev.remove();
                emitFlag = false;
                break;
        }
    
        if(emitFlag) {
            io.sockets.emit('rsp', {type: 'devIncoming', data: {addr: dev.addr, name: dev.findChar('0x1800', '0x2a00')}});
        }
    }
    ```
- When the `'DEV_LEAVING'` type event is received, the socket broadcasts the 'rsp' event with the 'devLeaving' type to inform all clients that one device have left the network. 

*************************************************
<a name="charNotif"></a>
#### 3. Processing characteristic notifications
If one wants to process notifications of a particular characteristic, regCharHdlr() can be called to register handler. We have done a demonstration in the previous section. In the handler, you can do anything you need to deal with, such as collecting received data for data analysis or send data to the cloud. For example, in the function of `tempNotifHdlr` the received sensing data is converted to Celsius scale, broadcasted to all clients via the socket, and passed to the cloud.

On server-side
```js
//bleSocket.js

// cloud setting
var XivelyClient = require('../models/xively.js'),
    client = new XivelyClient();

// ...

function tempNotifHdlr (data) {
    var rawT1, rawT2, m_tmpAmb, Vobj2, Tdie2,  
        Tref = 298.15, 
        S, Vos, fObj, tempVal,
        emitObj = {
            devAddr: sensorTag.addr,
            sensorType: '0xaa00',
            value: null
        };

    rawT1 = data.rawT1;
    rawT2 = data.rawT2;
    
    if(rawT2 > 32768) {
        rawT2 = rawT2 - 65536;
    }

    //convert data to Celsius temperature
    m_tmpAmb = (rawT1)/128.0;
    Vobj2 = rawT2 * 0.00000015625;
    Tdie2 = m_tmpAmb + 273.15;
    S = (6.4E-14) * (1 + (1.75E-3) * (Tdie2 - Tref) + (-1.678E-5) * Math.pow((Tdie2 - Tref), 2));
    Vos = -2.94E-5 + (-5.7E-7) * (Tdie2 - Tref) + (4.63E-9) * Math.pow((Tdie2 - Tref), 2);
    fObj = (Vobj2 - Vos) + 13.4 * Math.pow((Vobj2 - Vos), 2);
    tempVal = Math.pow(Math.pow(Tdie2, 4) + (fObj/S), 0.25);
    tempVal = _.ceil((tempVal - 273.15), 2);

    console.log('Temperature:   ' +  tempVal);
    emitObj.value = tempVal;

    // broadcast value to all client-side
    io.sockets.emit('rsp', {type: 'attrInd', data: emitObj});

    // pass value to the cloud
    client.feed.new('99703785', 'temperature', tempVal);

    // if temperature too high, switch the relay on to open fan
    if (tempVal > 30 && relay && relay.switch === 'off') {
        connAndSwitchRelay('on');
    }
}
```

On client-side
```js
//client.js

var socket = io.connect('http://192.168.1.109:3000/');

socket.on('rsp', function (msg) {
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
#### 4. Controlling devices via a web page
Real devices can be controlled via web page. For example, when one presses `On` button on the web page, the client looks for related information from this button and then emits an event to notify the server, and the server-side then performs a corresponding process for the received messages. Please refer to the following sample code,

On client-side
```js
//client.js

$('.switchOn').click(function () {
    var devId = $(this).parent().parent().parent().parent().prev().parent().attr('id'),
        servId = $(this).parent().attr('id'),
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
    // emit 'req' event with type 'write' to notify server-side 
    socket.emit('req', emitObj);
});
```

On the server-side, when the server receives an event which the `On` button of a relay is pressed, the server calls the write() command to turn on the relay.
```js
//bleSocket.js

exports.initialize = function(server) {
    io = io(server);

    io.on('connection', function (socket) {
        // ...
        socket.on('req', socketReqHdlr);
    });
};

// ...

function socketReqHdlr (msg) {
    var data = msg.data;

    switch (msg.type) {
        //...

        case 'write':
            if (data.devId === plug.addr) {
                // ...
            } else if (data.devId === healBracelet.addr) {
                // ...
            } else if (data.devId === relay.addr) {
                if (data.val === 'on') {
                    // open fan
                    relay.write(data.uuidServ, data.uuidChar, new Buffer([0x01]));
                } else {
                    // close fan
                    relay.write(data.uuidServ, data.uuidChar, new Buffer([0x00]));
                }
            }
            break;
    }
}
```

<br />
<a name="Example"></a>
##Example
Please refer to [sensorTagApp.js](https://github.com/hedywings/ble-shepherd/blob/develop/examples/sensorTagApp.js).It is a very simple application, implemented by sensorTag and keyFob. 

<br />
<a name="License"></a>
##License
The MIT License (MIT)

Copyright (c) 2016 Hedy Wang <hedywings@gmail.com>

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