var _ = require('lodash'),
    should = require('should'),
    shouldP = require('should-promised'),
    ccBnp = require('ccbnp'),
    Secmdl = require('../lib/management/secmdl'),
    secmdl = new Secmdl();

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
    var setting = {
            pairMode: 0,
            ioCap: 3,
            mitm: false,
            bond: false
        },
        secmdl2 = new Secmdl(setting);

    it('Secmdl(setting) - without setting', function () {
        (secmdl.state).should.equal('unencrypted');
        (secmdl.pairMode).should.equal(1);
        (secmdl.ioCap).should.equal(4);
        (secmdl.mitm).should.equal(1);
        (secmdl.bond).should.equal(1);
    });

    it('Secmdl(setting) - with setting', function () {
        (secmdl2.state).should.equal('unencrypted');
        (secmdl2.pairMode).should.equal(setting.pairMode);
        (secmdl2.ioCap).should.be.equal(setting.ioCap);
        (secmdl2.mitm).should.be.equal(setting.mitm);
        (secmdl2.bond).should.be.equal(setting.bond);
    });
});

describe('Signature Check', function () {
    var errMsg = 'setting must be an object.';

    it('setParam(param, val) - no arg', function () {
        return secmdl.setParam().should.be.rejectedWith('Bad Arguments. Data must be given.');
    });

    it('setParam(param, val) - bad param type', function () {
        return secmdl.setParam([], 1).should.be.rejectedWith('param must be a number');
    });

    it('setParam(param, val) - bad val type', function () {
        return secmdl.setParam(0x0400, '1').should.be.rejectedWith('val must be a number');
    });

    it('setParam(param, val) - error param id', function () {
        return secmdl.setParam(1, 1).should.be.rejectedWith('Param input error.');
    });

    it('setParam(param, val) - error param id', function () {
        return secmdl.setParam(1, 1).should.be.rejectedWith('Param input error.');
    });

    it('update(setting) - string', function () {
        return secmdl.update('xxx').should.be.rejectedWith(errMsg);
    });

    it('update(setting) - number', function () {
        return secmdl.update(123).should.be.rejectedWith(errMsg);
    });

    it('update(setting) - array', function () {
        return secmdl.update([]).should.be.rejectedWith(errMsg);
    });

    it('update(setting) - boolean', function () {
        return secmdl.update(true).should.be.rejectedWith(errMsg);
    });
});

describe('Functional Check', function () {
    it('connect to device', function () {
        secmdl.ownerDev = {connHdl: 0};
        return ccBnp.gap.estLinkReq(0, 0, 0, '0x78c5e570796e').should.be.fulfilled();
    });

    it('setParam()', function () {
        return secmdl.setParam('PairingMode', 1).should.be.fulfilled();
    });

    it('init()',function () {
        return secmdl.init().should.be.fulfilled();
    });

    it('passPasskey()', function (done) {
        secmdl.passPasskey('000000', function (err) {
            if (err.errorCode === 18)
                done();
        });
    });

    this.timeout(3000);
    it('pairing()', function (done) {
        secmdl.pairing().then(function (result) {
            secmdl.ltk = result.dev_ltk;
            secmdl.div = result.dev_div;
            secmdl.rand = result.dev_rand;
            done();
        });
    });

    it('cancelPairing()', function () {
        return secmdl.cancelPairing().should.be.fulfilled();
    });

    it('bonding() - with complete info', function () {
        return secmdl.bonding().should.be.fulfilled();
    });

    it('bonding() - without complete info', function () {
        delete secmdl.div;
        return secmdl.bonding().should.be.rejectedWith('No complete information to bond to a device.');
    });

    it('cleanAllBond()', function () {
        return secmdl.cleanAllBond().should.be.fulfilled();
    });

    it('expInfo()', function () {
        delete secmdl.ownerDev;
        delete secmdl.state;
        secmdl.div = undefined;
        secmdl.expInfo().should.deepEqual(secmdl);
    });

    it('update()', function () {
        // can't testing here
    });

    it('disconnect to device', function () {
        return ccBnp.gap.terminateLink(0, 19).should.be.fulfilled();
    });
});