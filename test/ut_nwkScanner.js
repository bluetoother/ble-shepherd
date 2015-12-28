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
            time: 10240,
            interval: 16,
            window: 16
        },
        linkParams = {
            interval: 80, 
            latency: 0,
            timeout: 2000
        };

    it('NwkScanner()', function () {
        (nwkScanner.permitState).should.equal('off');
        (nwkScanner.scanParams).should.deepEqual(scanParams);
        (nwkScanner.linkParams).should.deepEqual(linkParams);
    });
});

describe('Signature Check', function () {
    errMsg = 'setting must be an object and not be an array.';

    it('setScanParam(setting) - string', function () {
        return nwkScanner.setScanParams('xxx').should.be.rejectedWith(errMsg);
    });

    it('setScanParam(setting) - number', function () {
        return nwkScanner.setScanParams(123).should.be.rejectedWith(errMsg);
    });

    it('setScanParam(setting) - array', function () {
        return nwkScanner.setScanParams([]).should.be.rejectedWith(errMsg);
    });

    it('setScanParam(setting) - boolean', function () {
        return nwkScanner.setScanParams(true).should.be.rejectedWith(errMsg);
    });

    it('setLinkParams(setting) - string', function () {
        return nwkScanner.setLinkParams('xxx').should.be.rejectedWith(errMsg);
    });

    it('setLinkParams(setting) - number', function () {
        return nwkScanner.setLinkParams(123).should.be.rejectedWith(errMsg);
    });

    it('setLinkParams(setting) - array', function () {
        return nwkScanner.setLinkParams([]).should.be.rejectedWith(errMsg);
    });

    it('setLinkParams(setting) - boolean', function () {
        return nwkScanner.setLinkParams(true).should.be.rejectedWith(errMsg);
    });
});

describe('Functional Check', function () {
    var scanParams = {
            time: 10240,
            interval: 16,
            window: 16
        },
        linkParams = {
            interval: 80,
            latency: 0,
            timeout: 2000
        };

    it('setScanParam() - no setting', function (done) {
        nwkScanner.setScanParams().then(function () {
            if (_.isEqual(nwkScanner.scanParams, scanParams)) {
                done();
            }
        });
    });

    it('setScanParams() - partial setting', function (done) {
        nwkScanner.setScanParams({interval: 8, window: 8}).then(function () {
            scanParams.interval = 8;
            scanParams.window = 8;
            if (_.isEqual(nwkScanner.scanParams, scanParams)) 
                done();
        });
    });

    it('setScanParams() - full setting', function (done) {
        nwkScanner.setScanParams({time: 5012, interval: 16, window: 16}).then(function () {
            scanParams.time = 5012;
            scanParams.interval = 16;
            scanParams.window = 16;
            if (_.isEqual(nwkScanner.scanParams, scanParams)) 
                done();
        });
    });

    it('getScanParams()', function (done) {
        nwkScanner.getScanParams().then(function () {
            if (_.isEqual(nwkScanner.scanParams, scanParams))
                done();
        });
    });

    it('setLinkParams() - no setting', function (done) {
        nwkScanner.setLinkParams().then(function () {
            if (_.isEqual(nwkScanner.linkParams, linkParams))
                done();
        });
    });

    it('setLinkParams() - partial setting', function (done) {
        nwkScanner.setLinkParams({interval: 40, latency: 2}).then(function () {
            linkParams.interval = 40;
            linkParams.latency = 2;
            if (_.isEqual(nwkScanner.linkParams, linkParams))
                done();
        });
    });

    it('setLinkParams() - full setting', function (done) {
        nwkScanner.setLinkParams({interval: 80, latency: 0, timeout: 1000}).then(function () {
            console.log(nwkScanner.linkParams);
            linkParams.interval = 80;
            linkParams.latency = 0;
            linkParams.timeout = 1000;
            if (_.isEqual(nwkScanner.linkParams, linkParams))
                done();
        });
    });

    it('getLinkParams()', function (done) {
        nwkScanner.getLinkParams().then(function () {
            if (_.isEqual(nwkScanner.linkParams, linkParams))
                done();
        });
    });

    this.timeout(6000);
    it('scan()', function (done) {
        nwkScanner.scan().then(function (result) {
            _.forEach(result, function (dev) {
                if (dev.addr === '0x78c5e570796e')
                    done();
            });
        });
    });

    it('cancelScan() - without scan()', function () {
        return nwkScanner.cancelScan().should.be.rejectedWith('bleIncorrectMode');
    });

    it('cancelScan() - with scan()', function () {
        nwkScanner.scan().then(function (result) {
            if (result === [])
                done();
        });
        nwkScanner.cancelScan();
    });

    it('permitJoin(mode) - mode is true & permitState is off', function () {
        return nwkScanner.permitJoin(true).should.be.fulfilled();
    });

    it('permitJoin(mode) - mode is true & permitState is on', function () {
        nwkScanner.permitState = 'on';
        return nwkScanner.permitJoin(true).should.be.rejectedWith('Scanning has already start.');
    });

    it('permitJoin(mode) - mode is false & permitState is on', function () {
        return nwkScanner.permitJoin(false).should.be.fulfilled();
    });

    it('permitJoin(mode) - mode is false & permitState is off', function () {
        nwkScanner.permitState = 'off';
        return nwkScanner.permitJoin(false).should.be.rejectedWith('Scanning has already stop.');
    });

    this.timeout(10000);
    it('_contScan()', function (done) {
        var count = 1;
        nwkScanner.setScanParams({time: 2000}).then(function () {
            nwkScanner._contScan();
        });
        nwkScanner.on('NS:IND', function (msg) {
            count++;
            if (count === 5)
                done();
        });
    });
});

