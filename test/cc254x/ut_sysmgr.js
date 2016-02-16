var _ = require('lodash'),
    should = require('should-promised'),
    ccBnp = require('ccbnp'),
    sysmgr = require('../../lib/cc254x/management/sysmgr');

describe('System manager testing: ', function() {
    var spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    },
    startupMsg = {};

    it ('start connection', function (done) {
        ccBnp.on('ready', function (msg) {
            startupMsg.addr = msg.devAddr;
            startupMsg.irk = msg.IRK;
            startupMsg.csrk = msg.CSRK;
            done();
        });
        ccBnp.init(spConfig, 'central');
    });

    it('softReset() check', function () {
        sysmgr.softReset().should.be.fulfilledWith({status: 0});
    });

    it('hardReset() check', function () {
        sysmgr.hardReset().should.be.fulfilledWith({status: 0});
    });
});

