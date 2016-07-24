## Advanced topics

1. [How to define your own Services and Characteristics](#addDefinition)  
2. [How to add your own Services to central](#addService)  
3. [How to create a Plugin for your own device](#addPlugin)

<a name="addDefinition"></a>
### 1. How to define your own Services and Characteristics

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
### 2. How to add your own Services to central

Use `central.regLocalServ(servInfo, callback)` method to create a local Service on the central and register it to CC254X BNP.  
    
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

    central.regLocalServ(servInfo, function (err, service) {
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

    central.regLocalServ(servInfo, function (err, service) {
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

    central.regLocalServ(servInfo, function (err, service) {
        if (err)
            console.log(err);
        else
            console.log(service);
    });
    ```

*************************************************
<a name="addPlugin"></a>
### 3. How to create a Plugin for your own device  

## What is a plugin for?  

To help developers with identifying what kinds of BLE devices are joining to the network, **ble-shepherd** allows manufacturers to provide plugins to register to **ble-shepherd** for their own products. Once a developer use such a plugin, he/she can easily tell what a device is coming to his/her application. That's cool, isn't it.  

Let me show you an example. Assuming that I have a BLE relay module designed by the company **sivann**, and sivann provides me with a plugin `bshep-plugin-sivann-relay` to help me with identifying this relay. All I have to do is to require this plugin and register it to **ble-shepherd** like this:  

```javascript
var sivannRelayPlugin = require('bshep-plugin-sivann-relay'); 
central.regPlugin('hello-my-relay', sivannRelayPlugin);
```

And in my application, I can easily tell if an incoming device is my `'hello-my-relay'`  

```javascript
central.on('IND', function (msg) {
    var dev;

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = msg.data;

            if (dev.name === 'hello-my-relay') {
                // Ok, if I am here, I know my lovely relay is coming to the network,   
                // and then I can attach my notification handler or do something magic to it
            }
            break;

            // ...
    }
});
```

## Design yours  

First of all, it is recommended to name your plugin with the prefix `'bshep-plugin-'` to help developers to search **ble-shepherd** plugins on npm or github.  

To have your own plugin is simple, just follow the description here to create one:  

* The **plugin** is an object which has two properties, `examine` and `gattDefs`, respectively. Where `examine` is a function and is mandatory, and `gattDefs` a meta-data object and is optional.  
    * `examine` (*Function*): `function (peripheral, basicInfo) {}`. After a successful registration of your plugin, **ble-shepherd** will invoke this function when it needs the plugin. **ble-shepherd** will pass a `peripheral` instance and basic information `basicInfo` about the peripheral to this function. In your implementation, grab the object `basicInfo` to help you to tell whether this `peripheral` is yours. You should return `true` if it is, else return `false`. The object `basicInfo` will give you with the following properties, use them to examine and tell **ble-shepherd** if this `peripheral` is yours.  

        | Property     | Type   | Description                                                       |
        |--------------|--------|-------------------------------------------------------------------|
        | devName      | String | Device name. It is the value of Characteristic UUID 0x2a00.       |
        | manufacturer | String | Manufacturer name. It is the value of Characteristic UUID 0x2a29. |
        | model        | String | Model Number. It is the value of Characteristic UUID 0x2a24.      |
        | serial       | String | Serial Number. It is the value of Characteristic UUID 0x2a25.     |
        | fwRev        | String | Firmware revision. It is the value of Characteristic UUID 0x2a26. |
        | hwRev        | String | Hardware revision. It is the value of Characteristic UUID 0x2a27. |
        | swRev        | String | Software revision. It is the value of Characteristic UUID 0x2a28. |

    * `gattDefs` (*Object*): This property is a meta-data object and is optional. If you have some private GATT definitions on your BLE device, tell **ble-shepherd** with this property. When developers register the plugin, the definitions will be registered as well. The meta-data object `gattDefs` should contain the following two properties:  

        | Property       | Type  | Description                                         |
        |----------------|-------|-----------------------------------------------------|
        | service        | Array | An array of the _Service information object_        |
        | characteristic | Array | An array of the _Characteristic information object_ |

    **Note**: Lear more about the _Service information object_ and _Characteristic information object_ in section [How to define your own Services and Characteristics](#addDefinition).  

* The Relay Example of `bshep-plugin-sivann-relay`  

```js
var relayPlugin = {
    gattDefs: {
        service: [
            { name: 'pwrAndCurrServ', uuid: '0xbb30' },
            { name: 'relayServ', uuid: '0xbb40' }
        ],
        characteristic: [
            { name: 'pwrAndCurrMeasPeriod', uuid: '0xbb31', params: [ 'period' ], types: [ 'uint8' ] }
        ]
     },
     examine: function (periph, basicInfo) {
        var isMine = false;

        if (basicInfo.manufacturer === 'sivann' &&
            basicInfo.model === 'RelayModule' &&
            basicInfo.fwRev === 'v1.0.0' &&
            basicInfo.hwRev === 'v1.0.0' &&
            basicInfo.swRev === 'v1.0.0')
            isMine = true;

        return isMine;
    }
};

module.exports = relayPlugin;
```

At the very last step, don't forget to publish your plugin to [npm](https://www.npmjs.com/).  