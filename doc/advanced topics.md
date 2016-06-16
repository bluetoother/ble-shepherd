## Advanced topics

    - 1. [How to define your own Services and Characteristics](#addDefinition)  
    - 2. [How to add your own Services to central](#addService)  
    - 3. [How to create a Plugin belong your own device](#addPlugin)

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
<a name="addPlugin"></a>
### 3. How to create a Plugin belong your own device

You can create a plugin for your Bluetooth device, and provided to developers to register, so they can determine what kind of device join the network.

* `plugin` is an object and contains two properties, respectively `analysis` and `gattDefs`, `analysis` is mandatory and `gattDefs` is optional.
    * `analysis` (*Function*): `function (peripheral, basicInfo) {}`. **ble-shepherd** will give you an instance and basic information of peripheral, in accordance with the information, you need to judge whether the peripheral is developed by you, and return `true` or `false` to let **ble-shepherd** know. All information contained in basicInfo listed in the table below. 

        | Property     | Type   | Description                                                       |
        |--------------|--------|-------------------------------------------------------------------|
        | devName      | String | Device nane. It is the value of Characteristic UUID 0x2a00.       |
        | manufacturer | String | Manufacturer name. It is the value of Characteristic UUID 0x2a29. |
        | model        | String | Model Number. It is the value of Characteristic UUID 0x2a24.      |
        | serial       | String | Serial Number. It is the value of Characteristic UUID 0x2a25.     |
        | fwRev        | String | Firmware revision. It is the value of Characteristic UUID 0x2a26. |
        | hwRev        | String | Hardware revision. It is the value of Characteristic UUID 0x2a27. |
        | swRev        | String | Software revision. It is the value of Characteristic UUID 0x2a28. |

    * `gattDefs` (*Object*): If your BLE device have some private GATT definitions, you can provide here, and it will be registered automatic when developer register your plugin to **ble-shepherd**. Each property of `gattDefs` list in following table.

        | Property       | Type  | Description                                         |
        |----------------|-------|-----------------------------------------------------|
        | service        | Array | An array of the _Service information object_        |
        | characteristic | Array | An array of the _Characteristic information object_ |

    **Note**: You can see more detail about _Service information object_ and _Characteristic information object_ in section [How to define your own Services and Characteristics](#addDefinition).

* Example

```js
var relayPlugin = {
    gattDefs: {
        service: [
            { name: 'pwrAndCurrServ', uuid: '0xbb30' },
            { name: 'relayServ', uuid: '0xbb40' }
        ],
        characteristic: [
            { name: 'pwrAndCurrMeasPeriod', uuid: '0xbb31', params: ['period'], types: ['uint8'] }
        ]
     },
     analysis: function (periph, basicInfo) {
        var checkFlag = false;

        if (basicInfo.manufacturer === 'sivann' &&
            basicInfo.model === 'RelayModule' &&
            basicInfo.version.fw === 'v1.0.0' && 
            basicInfo.version.hw === 'v1.0.0' &&
            basicInfo.version.sw === 'v1.0.0')
            checkFlag = true;

        return checkFlag;
    }
};
```