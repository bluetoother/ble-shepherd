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
  
**ble-shepherd** has all the features you need in controlling your BLE network, monitoring and operating BLE *pheripheral* devices. This controller has done many network managing things for you, i.e., auto scanning for *pheripheral* devices, storing(/reloading) connected devices records to(/from) the built-in database, configuring connection parameters, and notifying online/offline status of devices with auto reconnection.  

It is easy to set and receive notifications from remote *peripherals*. Furthermore, reading resources from and writing values to *periphrals* is also simple, here is an example:

``` js
peripheral.read('0x1800', '0x2a00', functional (err, value) {
    // value is remotely read from the peripheral device
});
peripheral.write('0x1800', '0x2a02', { flag: false }, functional (err) {
    // value is remotely write to the peripheral device
});
```
With **ble-shepherd**, you can get rid of such networking things and focus on your application logics. It opens another way of implementing IoT applications with BLE devices. With node.js, you can build your own application console(or dashboard) and design your own RESTful APIs in seconds. It's easy to make your BLE devices happy on the cloud.  
  
**Note**:  
At this moment, **ble-shepherd** is built on top of [cc-bnp](https://github.com/hedywings/ccBnp) and [noble]() libraries. They are targeting on TI [CC254X BLE Network Processor](http://processors.wiki.ti.com/index.php/CC254X_WITH_EXT_MCU#Network_Processor) and CSR8510 BLE4.0 USB adapter, respectively. This project may support TI [CC264X](http://processors.wiki.ti.com/index.php/CC2640_BLE_Network_Processor) in the near future (if I can get the development tools). Please let me know if you have any suggestions about the BLE SoC solutions.  

<br />

<a name="Features"></a>
##Features

- Building your machine network with BLE devices.  
- Controlling the network with no pain. Features of auto reconnection, permission of device joining, built-in database and many more are off-the-shelf.  
- Creating BLE IoT apps is simple and quick.  
- Allows you to define _Services_ and _Characteritics_ on **ble-shepherd** itself to make it a BLE gadget. **ble-shepherd** not just plays as a network controller.  
- Based-on node.js. It's easy to integrate BLE apps with other services or frameworks, e.g., http server, express, React.js, Angular.js.  

<br />

<a name="Installation"></a>
##Installation
> $ npm install ble-shepherd --save

<br />

<a name="Usage"></a>
## Usage
**ble-shepherd** exports its functionalities as a singleton denoted as `central` in this document. The following example shows how to create an application with **ble-shepherd** with CC254X BLE network processor(BNP) (see [central.start()](#API_start) if you like to use CSR BLE USB dongle).  

Fisrtly, set up your serial-port configuration to connect to BNP. Next, call method `start()` with your configuration `spCfg` and application function `app` to bring the `central` up. Your `app` will run right after connected to BNP. If you like to tackle something prior to your app loading, e.g., registering custom GATT definitions, just override the method `appInit()` to suit your needs.  
  
  
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

central.appInit = function () {
    // do something before app starting
    // usually register GATT definition by calling regGattDefs() here
}

central.start(app, spCfg);

function app() {
    // your application
}
```

<br />

<a name="APIs"></a>
## APIs and Events

####1. Control the Network 
>**central** is a singleton exported by `require('ble-shepherd')(chipName)`, where `chipName` can be either a string of `'cc254x'` or `'csr8510'` to specify the chip.  

* [central.start()](#API_start)
* [central.setNwkParams()](#API_setNwkParams)
* [central.permitJoin()](#API_permitJoin)
* [central.command()](#API_command)
* [central.find()](#API_find)
* [central.regGattDefs()](#API_regGattDefs)
* [central.addLocalServ()](#API_addLocalServ)
* ['IND' event](#EVT_ind)

####2. Monitor and Control the Peripherals
>**peripheral** is a software endpoint to represent a remote BLE device. You can use `central.find()` to find a connected _pheripheral_ device with its address or connection handle. Once you get the endpoint, you can invoke its read()/write() methods to operate the remote device.  

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

Some methods are not supported for CSR8510, they are listed in this table. (X: unsupported)

| Interface                             | Method            | CC254x BNP      |  CSR8510 dongle |
| --------------------------------------| ------------------| --------------- | --------------- |
| Control the Network                   | start             | O               | O               |
|                                       | setNwkParams      | O               | O               |
|                                       | permitJoin        | O               | O               |
|                                       | command           | O               | X               |
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
`require('ble-shepherd')(chipName)` exports the singleton of this class. This singleton instance is denoted as `central` in this document.  
*************************************************

<br />

<a name="API_start"></a>  
### .start(app[, spCfg])  
> Connects to the SoC and starts to run the app.  

**Arguments**  

1. `app` (*Function*): App which will be called after initialization completes.  
2. `spCfg` (*Object*): This value-object has two properties `path` and `options` to configure the serial port.  
    - `path`: a string that refers to the serial port system path, e.g., `'/dev/ttyUSB0'`  
    - `options`: an object to set up the [seiralport](https://www.npmjs.com/package/serialport#to-use). The following example shows the `options` with its default value.  

Note: If you are using the CSR8510 USB adapter, `spCfg` can be ignored.

**Returns**  

- (*Object*): central  

**Example**  

* Using CC254X SoC  

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
    // your application
};

central.start(app, spCfg);
```

* Using CSR8510 SoC  

```javascript
var central = require('ble-shepherd')('csr8510');
var app = function () {
    // your application
};

central.start(app); // spCfg is not required
```

*************************************************
<a name="API_setNwkParams"></a>  
###.setNwkParams(type, setting[, callback])  
> Set up network parameters of the BLE central.  

**Arguments**  

1. `type` (*String*): Can be `'scan'` or `'link'` to indicate which type of parameter you like to set.  
2. `setting` (*Object*): The following table shows the `setting` properties according to the given `type`.  

    - When `type === 'scan'`, the setting object should be with the keys:  
            
    | Property | Type   | Mandatory | Description       | Default value |
    |----------|--------|-----------|-------------------|---------------|
    | interval | Number | optional  | Scan interval(ms) | 0x0010        |
    | window   | Number | optional  | Scan window(ms)   | 0x0010        |

    - When `type === 'link'`, the setting object should be with the keys:
            
    | Property | Type   | Mandatory | Description                                                                | Default value |
    |----------|--------|-----------|----------------------------------------------------------------------------|---------------|
    | interval | Number | optional  | Connection interval(ms). This affects the transmission rate of connection. | 0x0018        |
    | latency  | Number | optional  | Connection slave latency(ms)                                               | 0x0000        |
    | timeout  | Number | optional  | Connection supervision timeout(ms)                                         | 0x00c8        |

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
###.permitJoin(time[, callback])  
> Open the network for devices to join in.  

**Arguments**  

1. `time` (*Number*): Time in seconds for the central to allow devices to join in the network. Set it to 0 will immediately close the admission.  
2. `callback` (*Function*): `function (err) { }`. Get called if any error or timeout occurs.  

**Returns**  

- (*Object*): central  

**Example**  

```javascript
// permit devices to join for 60 seconds 
central.permitJoin(60, function (err) {
    if (err)
        console.log(err);
    else
        console.log('From now on, devices cannot join in.');
});
```

*************************************************
<a name="API_command"></a>  
###.command(subGroup, cmd, argInst, callback)  
> Calls TI BLE Vendor-Specific HCI Commands. Please refer to **cc-bnp** document for details.
> - [Calling the TI BLE Vendor-Specific HCI Command APIs](https://github.com/hedywings/cc-bnp#calling-the-ti-ble-vendor-specific-hci-command-apis)
> - [Vendor-Specific HCI Command Reference Tables](https://github.com/hedywings/cc-bnp#vendor-specific-hci-command-reference-tables)

Note: This API is CC254X only.

**Arguments**  

1. `subGroup` (*String*): Sub-group name. Can be `hci`, `l2cap`, `att`, `gatt`, `gap`, or `util`.  
2. `cmd` (*String*): Function name of Vendor-Specific HCI Command API. You can find the function name from column **cc-bnp Cmd-API** in this [table](https://github.com/hedywings/cc-bnp#vendor-specific-hci-command-reference-tables).  
3. `args` (_Object_): An argument object along with the specified command. The accepted keys are listed in **Arguments** in this [table](https://github.com/hedywings/cc-bnp#vendor-specific-hci-command-reference-tables).  
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
<a name="API_find"></a>  
###.find(addrOrHdl)  
> Find a peripheral maintained by the central.  

**Arguments**  

1. `addrOrHdl` (*String* | *Number*): The address or connection handle of a peripheral.  

**Returns**  

- (*Object*): peripheral, an instance of the BlePeripheral class  

**Example**  

```javascript
// find() by address
var peripheral = central.find('0x78c5e570796e');

// find() by connection handle
var peripheral = central.find(0);
```

*************************************************
<a name="API_regGattDefs"></a>  
###.regGattDefs(type, regObjs)  
> Allows you to register private Services or Characteristic definitions.  

**Arguments**  

1. `type` (*String*): Can be `'service'` or `'characteristic'` to specofy which type of definition to register with.  
2. `regObjs` (*Array*): An array of the _Service information object_ or _Characteristic information object_ according to the given `type`.  

Note: See [How to define your own Service and Characteristic](#addDefinition) in the **Advanced topics** section to learn more.

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
 
Note: This command is CC254X only.

**Arguments**  

1. `servInfo` (*Object*): An object that contains properties of `uuid`, `name` and `charsInfo` to describe information about the Service.  

2. `callback` (*Function*) : `function (err, service) { }`, Get called when service successfully register to BNP. 

Note: See [How to add Services to central](#addService) of **Advanced topics** section to learn more.  

**Returns**  

- (*none*)  

**Example**  

```javascript
// Step1: prepare characteristic information
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

 The `msg.type` can be `DEV_ONLINE`, `DEV_INCOMING`, `DEV_LEAVING`, `PASSKEY_NEED` or `LOCAL_SERV_ERR` to reveal the message purpose.  

- **DEV_ONLINE**  
    A peripheral has just joined the network, but not yet synchronized (services re-discovery).  

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
    A peripheral has joined the network and synchronized.  

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

- **PASSKEY_NEED**  
    The encryption process of connection is requesting for a passkey. This event is CC254X only.

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
    An error occurs while processing an incoming peripheral ATT event. This event is CC254X only.

    - `msg.type` (*String*): `'LOCAL_SERV_ERR'`
    - `msg.data` (*Object*): This object has fileds of `evtData` and `err`. `evtData` is the request message emitted from a remote peripheral, `err` is an error object describing the reason why the request cannot be processed.  
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

## BlePeripheral Class  
`central.find(addrOrHdl)` returns a instance of this class, otherwise returns `undefined` if not found. The instance, which is denoted as `peripheral` in this document, represents a remote peripheral in the server.  

<br />

*************************************************

<a name="API_connect"></a>
###.connect([callback])
> Connect to a remote BLE peripheral. The central will fire an `IND` event with message type `DEV_ONLINE` when connection is established and will fire an `IND` event with message type `DEV_INCOMING` when peripheral information synchronization accomplished.

**Arguments**
- `callback` (*Function*): `function (err) { }`. Get called when the connection between central and remote peripheral is established.  

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
> Disconnect from the remote BLE peripheral. The central will fire an `IND` event with meaasge type `DEV_LEAVING` when the procedure of disconnecting accomplished.  

**Arguments**
- `callack` (*Function*): `function (err) { }`. Get called when the connection between central and remote peripheral is disconnected.  

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
> Disconnect from the remote BLE peripheral and remove its record from the database. The central will fire an `IND` event with meaasge type `DEV_LEAVING` when the procedure of disconnecting accomplished. 

**Arguments**
- `callack` (*Function*): `function (err) { }`. Get called when the connection between central and remote peripheral is disconnected and peripheral record is removed.  

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
> Encrypt the connection between the central and peripheral. The central will fire an `IND` event along with message type `PASSKEY_NEED` if it requires a passkey during the encryption procedure for MITM protection.  

Note: This command is CC254X only.

**Arguments**  

1. `setting` (*Object*): Peripheral security setting. The following table shows the details of each property.  
2. `callback` (*Function*): `function (err) { }`. Get called when encryption completes.  

| Property | Type     | Mandatory | Description     | Default value |
|----------|----------|-----------|-----------------|---------------|
| pairMode | Number   | Optional  | pairing mode    | 0x01          |
| ioCap    | Number   | Optional  | io capabilities | 0x04          |
| mitm     | Boolean  | Optional  | MITM protection | true          |
| bond     | Boolean  | Optional  | bonding enable  | true          |

Note: Please refer to the document [TI BLE Vendor Specific HCI Guide.pdf (P77)](https://github.com/hedywings/ccBnp/raw/master/documents/TI_BLE_Vendor_Specific_HCI_Guide.pdf) for `pairMode` and `ioCap` descriptions.  

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

Note: This command is CC254X only.

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
> Update the `peripheral` instance with the lastest characteristics value reading from the remote device.  

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
> Register a handler to handle notification or indication of a Characteristic.

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
In order to let **ble-shepherd** parse and build the packet of your private services and characteristics, you should first register the private definitions to **ble-shepherd** by `central.regGattDefs(type, regObjs)` method.  

* `regObjs` contains the registration information depending on which type you want to register.
    * If `type === 'service'`, `regObjs` should be given with an array of the _Service information object_. Each entry is an object with properties shown in the table:

        | Property | Type     | Mandatory | Description         |
        |----------|----------|-----------|---------------------|
        | uuid     | String   | required  | characteristic uuid |
        | name     | String   | required  | characteristic name |
        (Note: Make sure that your `name` and `uuid` won't conflict with a public Service or a registered Service.)

    * If `type === 'characteristic'`, `regObjs` should be given with an array of the _Characteristic information object_. Each entry is an object with properties shown in the table:  
    
        | Property | Type   | Mandatory | Description                    |
        |----------|--------|-----------|--------------------------------|
        | uuid     | String | required  | characteristic uuid            |
        | name     | String | required  | characteristic name            |
        | params   | Array  | required  | characteristic parameters      |
        | types    | Array  | required  | characteristic parameters type |
        * `params`: The Characteristic value will be parsed into an object according to the keys orderly given in this array.  
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
###How to add services to central
Use the `central.addLocalServ(servInfo, callback)` method to create a local service on the central and register it to the CC254X BNP.  
    
* The following table shows the details of each property within the object `servInfo`.  

    | Property  | Type   | Mandatory | Description                                          |
    |-----------|--------|-----------|------------------------------------------------------|
    | uuid      | String | required  | service uuid                                         |
    | name      | String | optional  | service name                                         |
    | charsInfo | Array  | required  | including lots of characteristic information objects |

* Each entry in `charsInfo` array should be an object having the following preoperties:

    | Property | Type             | Mandatory | Description                |
    |----------|------------------|-----------|----------------------------|
    | uuid     | String           | required  | characteristic uuid        |
    | name     | String           | optional  | characteristic name        |
    | permit   | Array            | required  | characteristic permission  |
    | prop     | Array            | required  | characteristic property    |
    | val      | Object or Buffer | required  | characteristic value       |
    | desc     | String           | optional  | characteristic description |

    - Allowed Characteristic permission `permit`: 'Read', 'Write', 'AuthenRead', 'AuthenWrite', 'AuthorRead', 'AuthorWrite', 'EncryptRead', 'EncryptWrite'
    - Allowed Characteristic property `prop`: 'Broadcast', 'Read', 'WriteWithoutResponse', 'Write', 'Notify', 'Indicate', 'AuthenticatedSignedWrites', 'ExtendedProperties'

* Differences between **prop** and **permit**
    - Each Characteristic has a lot of attributes, including Characteristic value and many optional information about the value, such as _Characteristic User Description_.
        - `permit`: Each attribute in a Characteristic has its own permission, and `permit` is used to define its permission.  
        - `prop`: `prop` is an attribute in a Characteristic to describe the permission of Characteristic value. Having a read permission can let GATT clients know what operations they can perform upon the Characteristic value.  
        
    Note: `prop` must be compatible with `permit`, otherwise GATT clients will be misled.  

* Example
    * Add Characteristics into a public Service
        - If the Characteristic is a public-defined one, charInfo `val` should be an object with keys list in the _Field Name_ of the [public UUID table](https://github.com/hedywings/cc-bnp#3-characteristics).  
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

    * Add Characteristics into a private  
        - If the Characteristic is not a public-defined one, you need to register its definition first[(see section "How to define your own Service and Characteristic")](#addDefinition). You can also parse/build raw packet of a Characteristic value on your own without doing the registration of your private definitions.  

    ```js
    // if Characteristic definition is not registered, type of a Characteristic value can only be a buffer
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

    // if Characteristic definition is registered, characteristic value should be an object with keys according to `params` you've registered  
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

<br />

<a name="Demo"></a>
##Demo  

With **ble-shepherd**, it is easy and quick to implement BLE IoT apps as well as manage your BLE peripherals.  

**ble-shepherd** works well with web frameworks like [ExpressJS](#http://expressjs.com/), it's very convenient for front-end developers to build graphic user interfaces for displaying device information, monitoring sensing data and operating peripherals. Making your own RESTful APIs with ExpressJS is also a great idea.  

Here is a simple ble-shepherd webapp buit up with ExpressJS and [socket.io](#http://socket.io/). ExpressJS provides web sevices and socket.io passes messages back and forth between the client and server, especially passes those asynchronous indications from remote devices to web client to avoid regularly polling.  

[TODO]
This demo is based on CSR8510 BLE USB dongle. Its maximum number of simultaneous connections is 5, a polling mechanism is required if you want to connect to more peripherals. The following four steps will guide you through the implementation of ble-shepherd demo.
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