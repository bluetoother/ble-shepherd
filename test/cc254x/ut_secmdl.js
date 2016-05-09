//TODO, update()
var should = require('should'),
    shouldP = require('should-promised'),
    ccBnp = require('cc-bnp'),
    Secmdl = require('../../lib/cc254x/management/secmdl'),
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
        (secmdl.mitm).should.be.true();
        (secmdl.bond).should.be.true();
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
    var errMsg = 'setting must be an object.',
        passkeyErrMsg = 'passkey must be number and should not exceed six numbers';

    it('setParam(param, val)', function () {
        (function () { secmdl.setParam(); }).should.throw();
        (function () { secmdl.setParam([], 1); }).should.throw();
        (function () { secmdl.setParam(0x0400, '1'); }).should.throw();
        (function () { secmdl.setParam(1, 1); }).should.throw();
    });

    it('passPasskey(passkey)', function () {
        (function () { secmdl.passPasskey(); }).should.throw();
        (function () { secmdl.passPasskey('xxx'); }).should.throw();
        (function () { secmdl.passPasskey({}); }).should.throw();
        (function () { secmdl.passPasskey([]); }).should.throw();
        (function () { secmdl.passPasskey(false); }).should.throw();
        (function () { secmdl.passPasskey(1234567); }).should.throw();
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
        secmdl._ownerDev = {connHdl: 0};
        return ccBnp.gap.estLinkReq(0, 0, 0, '0x78c5e570796e').should.be.fulfilled();
    });

    it('setParam()', function () {
        return secmdl.setParam('PairingMode', 1).should.be.fulfilled();
    });

    it('init()',function () {
        return secmdl.init().should.be.fulfilled();
    });

    it('passPasskey()', function (done) {
        secmdl.passPasskey('000000').fail(function (err) {
            if (err.errorCode === 18)
                done();
        });
    });

    this.timeout(6000);
    it('pairing()', function (done) {
        secmdl.pairing().then(function () {
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
        delete secmdl._ownerDev;
        delete secmdl.state;
        secmdl.div = undefined;
        secmdl.expInfo().should.deepEqual(secmdl);
    });

    it('update()', function () {
        // TODO
        // can't testing here
    });

    it('disconnect to device', function () {
        return ccBnp.gap.terminateLink(0, 19).should.be.fulfilled();
    });
});