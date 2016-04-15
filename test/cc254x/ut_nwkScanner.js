var _ = require('lodash'),
    should = require('should-promised'),
    ccBnp = require('cc-bnp'),
    nwkScanner = require('../../lib/cc254x/management/nwkScanner');

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
            interval: 24, 
            latency: 0,
            timeout: 200
        };

    it('NwkScanner()', function () {
        (nwkScanner.scanParams).should.deepEqual(scanParams);
        (nwkScanner.linkParams).should.deepEqual(linkParams);
    });
});

describe('Functional Check', function () {
    var scanParams = {
            time: 10240,
            interval: 16,
            window: 16
        },
        linkParams = {
            interval: 24,
            latency: 0,
            timeout: 200
        };

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
                if (dev)
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
});

