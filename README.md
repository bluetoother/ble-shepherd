#ble-shepherd  
A network controller and manager for the BLE machine network running on node.js  

[![NPM](https://nodei.co/npm/ble-shepherd.png?downloads=true)](https://nodei.co/npm/ble-shepherd/)  

[![Travis branch](https://travis-ci.org/bluetoother/ble-shepherd.svg?branch=master)](https://travis-ci.org/bluetoother/ble-shepherd)
[![npm](https://img.shields.io/npm/v/ble-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-shepherd)
[![npm](https://img.shields.io/npm/l/ble-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-shepherd)

<br />

## Documentation

Please visit the [Wiki](https://github.com/bluetoother/ble-shepherd/wiki).

<br />

## Overview  

**ble-shepherd** is a BLE network controller running on node.js. It is an extension of BLE *central* device that aims to help you in building a BLE machine network with less effort.(Here is a quick [**DEMO**](https://github.com/bluetoother/ble-shepherd/wiki#2-ble-webapp-with-http-server-and-reactjs)!)  

![BLE Network](https://github.com/bluetoother/documents/blob/master/ble-shepherd/ble_network.png)
  
**ble-shepherd** has all the features you need in controlling your BLE network, monitoring and operating BLE *peripheral* devices. This controller has carried many network managing things for you, i.e., auto scanning for *peripheral* devices, storing(/reloading) connected devices records to(/from) the built-in database, configuring connection parameters, and notifying online/offline status of devices with auto reconnection.  

With **ble-shepherd**, you can get rid of such networking things and focus on your application logics. It opens another way of implementing IoT applications with BLE devices. With node.js, you can build your own application console(or dashboard) and design your own RESTful APIs in seconds. It's easy to make your BLE devices happy on the cloud.  

<br />

## Installation  

> $ npm install ble-shepherd --save  

* Hardware
    - [SmartRF05EB (with CC2540EM)](http://www.ti.com/tool/cc2540dk)  
    - [CC2540 USB Dongle](http://www.ti.com/tool/CC2540EMK-USB)  
    - [BLE4.0 USB adapter](https://github.com/sandeepmistry/node-bluetooth-hci-socket#compatible-bluetooth-40-usb-adapters)
    - CC2640/CC2650 (Not tested yet. I don't have the kit.)  

<br />

## Usage  

See [Usage](https://github.com/bluetoother/ble-shepherd/wiki#Usage) on the Wiki for details.

The following example shows how to create a new instance of the `BleShepherd` class and call method `start()` to bring the `central` up. 

* Using `noble` as a sub-module  
  
```javascript
var BleShepherd = require('ble-shepherd');

var central = new BleShepherd('noble');

// do something before app starting

central.start();
```

<br />

## License  
  
Licensed under [MIT](https://github.com/bluetoother/ble-shepherd/blob/master/LICENSE).
