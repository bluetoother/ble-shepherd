var blemgr = require('../lib/bleMgr'),
	spConfig = {
        path: '/dev/ttyUSB0',
        baudRate: 115200,
        rtscts: true,
        flowControl: true
    };

blemgr.start(spConfig, bleApp);

function bleApp () {
	// blemgr.devmgr.bleDevices[1].servs['0xfff0'].chars['0xfff4'].readDesc();
	// setTimeout(function () {
	// 	console.log(blemgr.devmgr.bleDevices[1].sm);
	// }, 3000);

	// setTimeout(function () {
	// 	console.log(blemgr.devmgr.bleDevices[2]);
	// }, 15000);
	
}
