var _ = require('lodash'),
    should = require('should-promised'),
    ccBnp = require('ccbnp'),
    NwkScanner = require('../lib/management/nwkScanner'),
    nwkScanner = new NwkScanner();

describe('start connection', function() {
	var spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

	it('init', function (done) {
		ccBnp.on('ready', function (msg) {
            done();
        });
        ccBnp.init(spConfig, 'central');
	});
});

describe('Constructor Check', function () {
	var scanParams = {
	        time: null,
	        interval: null,
	        window: null
	    },
	    linkParams = {
	        interval: null, 
	        latency: null,
	        timeout: null
	    };

	it('NwkScanner()', function () {
		(nwkScanner.permitState).should.equal('off');
		(nwkScanner.scanParams).should.deepEqual(scanParams);
		(nwkScanner.linkParams).should.deepEqual(linkParams);
	});
});

describe('Signature Check', function () {
	errMsg = 'setting must be an object and not be an array.';

	it('setScanParam(setting, callback) - string', function () {
		return nwkScanner.setScanParams('xxx').should.be.rejectedWith(errMsg);
	});

	it('setScanParam(setting, callback) - number', function () {
		return nwkScanner.setScanParams(123).should.be.rejectedWith(errMsg);
	});

	it('setScanParam(setting, callback) - array', function () {
		return nwkScanner.setScanParams([]).should.be.rejectedWith(errMsg);
	});

	it('setScanParam(setting, callback) - boolean', function () {
		return nwkScanner.setScanParams(true).should.be.rejectedWith(errMsg);
	});

	it('setLinkParams(setting, callback) - string', function () {
		return nwkScanner.setLinkParams('xxx').should.be.rejectedWith(errMsg);
	});

	it('setLinkParams(setting, callback) - number', function () {
		return nwkScanner.setLinkParams(123).should.be.rejectedWith(errMsg);
	});

	it('setLinkParams(setting, callback) - array', function () {
		return nwkScanner.setLinkParams([]).should.be.rejectedWith(errMsg);
	});

	it('setLinkParams(setting, callback) - boolean', function () {
		return nwkScanner.setLinkParams(true).should.be.rejectedWith(errMsg);
	});
});

describe('Functional Check', function () {
	var scanParams = {
        time: 10240,
        interval: 16,
        window: 16
    };

	it('setScanParam() - no setting', function (done) {
		nwkScanner.setScanParams().then(function () {
			if (_.isEqual(nwkScanner.scanParams, scanParams)) {
				done();
			}
		});
	});

	it('setScanParams() - partial setting', function (done) {
		nwkScanner.setScanParams({time: 5120, window: 8}).then(function () {
			scanParams.time = 5120;
			scanParams.window = 8;
			if (_.isEqual(nwkScanner.scanParams, scanParams)) { done(); }
		});
	});

    it('setScanParams() - full setting', function (done) {
        nwkScanner.setScanParams({time: 10240, interval: 8, window: 16}).then(function () {
            scanParams.time = 10240;
            scanParams.interval = 8;
            scanParams.window = 16;
            if (_.isEqual(nwkScanner.scanParams, scanParams)) { done(); }
        });
    });
});

