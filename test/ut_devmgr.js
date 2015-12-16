var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    fs = require('fs'),
    Devmgr = require('../lib/management/devmgr'),
    devmgr = new Devmgr(),
    GATTDEFS = require('../lib/defs/gattdefs'),
    bledb = require('../lib/bledb');

var dbPath = '../lib/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var blePeri = devmgr.newDevice('peripheral', '0x78c5e570796e', 0),
    bleCen = devmgr.newDevice('central', '0x78c5e570737f');

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
    it('devmgr', function () {
        should(devmgr._scanState).be.equal('off');
        should(devmgr.bleDevices).be.deepEqual([blePeri]);
        should(devmgr.discDevices).be.deepEqual([]);
    });

    it('peripheral', function () {
        should(blePeri._id).be.equal('78c5e570796e');
        should(blePeri._isSync).be.false();
        should(blePeri.ownerDevmgr).be.deepEqual(devmgr);
        should(blePeri.role).be.equal('peripheral');
        should(blePeri.addr).be.equal('0x78c5e570796e');
        should(blePeri.addrType).be.equal(0);
        should(blePeri.state).be.equal('disc');
        should(blePeri.connHdl).be.null();
        should(blePeri.linkParams).be.null();
        should(blePeri.servs).be.deepEqual({});
        should(blePeri.sm).be.null();
    });

    it('central', function () {
        should(bleCen.role).be.equal('central');
        should(bleCen.addr).be.equal('0x78c5e570737f');
        should(bleCen.servs).be.deepEqual([]);
    });
});

describe('Signature Check', function () {
    describe('devmgr', function () {
        it('newDevice(role, addr, addrType)', function () {
            var addr = '0x123456789012';
            (function () { devmgr.newDevice('central', addr); }).should.not.throw();
            (function () { devmgr.newDevice('peripheral', addr, 0); }).should.not.throw();

            (function () { devmgr.newDevice(); }).should.throw();
            (function () { devmgr.newDevice('xxx', addr); }).should.throw();
            (function () { devmgr.newDevice([], addr); }).should.throw();
            (function () { devmgr.newDevice({}, addr); }).should.throw();
            (function () { devmgr.newDevice(false, addr); }).should.throw();
            (function () { devmgr.newDevice(undefined, addr); }).should.throw();
            (function () { devmgr.newDevice(null, addr); }).should.throw();

            (function () { devmgr.newDevice('central', '123456789012'); }).should.throw();
            (function () { devmgr.newDevice('central', '0x12'); }).should.throw();
            (function () { devmgr.newDevice('central', []); }).should.throw();
            (function () { devmgr.newDevice('central', {}); }).should.throw();
            (function () { devmgr.newDevice('central', false); }).should.throw();
            (function () { devmgr.newDevice('central', undefined); }).should.throw();

            (function () { devmgr.newDevice('peripheral', addr); }).should.throw();
            (function () { devmgr.newDevice('peripheral', addr, []); }).should.throw();
            (function () { devmgr.newDevice('peripheral', addr, {}); }).should.throw();
            (function () { devmgr.newDevice('peripheral', addr, 'xxx'); }).should.throw();
            (function () { devmgr.newDevice('peripheral', addr, false); }).should.throw();
            (function () { devmgr.newDevice('peripheral', addr, undefined); }).should.throw();
        });

        it('findDev(addrOrHdl)', function () {
            (function () { devmgr.findDev('xxx'); }).should.not.throw();
            (function () { devmgr.findDev(123); }).should.not.throw();

            (function () { devmgr.findDev([]); }).should.throw();
            (function () { devmgr.findDev({}); }).should.throw();
            (function () { devmgr.findDev(false); }).should.throw();
            (function () { devmgr.findDev(undefined); }).should.throw();
            (function () { devmgr.findDev(null); }).should.throw();
        });
    });

    describe('peripheral', function () {
        var linkErrMsg = 'All argument must be number.',
            encryptErrMsg = 'setting must be an object';
        it('linkParamUpdate(interval, latency, timeout) - no arg', function () {
            return blePeri.linkParamUpdate().should.be.rejectedWith(linkErrMsg);
        });

        it('linkParamUpdate(interval, latency, timeout) - partial arg', function () {
            return blePeri.linkParamUpdate(12, 22).should.be.rejectedWith(linkErrMsg);
        });

        it('linkParamUpdate(interval, latency, timeout) - wrong type', function () {
            return blePeri.linkParamUpdate(12, 22, '45').should.be.rejectedWith(linkErrMsg);
        });
        it('linkParamUpdate(interval, latency, timeout) - wrong type', function () {
            return blePeri.linkParamUpdate(12, [], 100).should.be.rejectedWith(linkErrMsg);
        });
        it('linkParamUpdate(interval, latency, timeout) - wrong type', function () {
            return blePeri.linkParamUpdate({}, 50, 100).should.be.rejectedWith(linkErrMsg);
        });

        it('createSecMdl(setting)', function () {
            (function () { blePeri.createSecMdl({}); }).should.not.throw();

            (function () { blePeri.createSecMdl([]); }).should.throw();
            (function () { blePeri.createSecMdl(123); }).should.throw();
            (function () { blePeri.createSecMdl('xxx'); }).should.throw();
            (function () { blePeri.createSecMdl(false); }).should.throw();
            (function () { blePeri.createSecMdl(undefined); }).should.throw();
            (function () { blePeri.createSecMdl(null); }).should.throw();
        });

        it('encrypt(setting) - bad type', function () {
            return blePeri.encrypt([]).should.be.rejectedWith(encryptErrMsg);
        });
        it('encrypt(setting) - bad type', function () {
            return blePeri.encrypt('xxx').should.be.rejectedWith(encryptErrMsg);
        });
        it('encrypt(setting) - bad type', function () {
            return blePeri.encrypt(123).should.be.rejectedWith(encryptErrMsg);
        });
        it('encrypt(setting) - bad type', function () {
            return blePeri.encrypt(true).should.be.rejectedWith(encryptErrMsg);
        });
    });

    describe('central', function () {
        var regErrMsg = 'bleServ must be an object',
            delErrMsg = 'hdl must be a number';
        it('regServ(bleServ) - no arg', function () {
            return bleCen.regServ().should.be.rejectedWith(regErrMsg);
        });

        it('regServ(bleServ) - bad type', function () {
            return bleCen.regServ([]).should.be.rejectedWith(regErrMsg);
        });
        it('regServ(bleServ) - bad type', function () {
            return bleCen.regServ('xxx').should.be.rejectedWith(regErrMsg);
        });
        it('regServ(bleServ) - bad type', function () {
            return bleCen.regServ(123).should.be.rejectedWith(regErrMsg);
        });
        it('regServ(bleServ) - bad type', function () {
            return bleCen.regServ(null).should.be.rejectedWith(regErrMsg);
        });

        it('delServ(hdl) - no arg', function () {
            return bleCen.delServ().should.be.rejectedWith(delErrMsg);
        });

        it('delServ(hdl) - bad type', function () {
            return bleCen.delServ({}).should.be.rejectedWith(delErrMsg);
        });
        it('delServ(hdl) - bad type', function () {
            return bleCen.delServ([]).should.be.rejectedWith(delErrMsg);
        });
        it('delServ(hdl) - bad type', function () {
            return bleCen.delServ('xxx').should.be.rejectedWith(delErrMsg);
        });
        it('delServ(hdl) - bad type', function () {
            return bleCen.delServ(null).should.be.rejectedWith(delErrMsg);
        });

        it('findChar(hdl)', function () {
            (function () { bleCen.findChar(10); }).should.not.throw();

            (function () { bleCen.findChar(); }).should.throw();
            (function () { bleCen.findChar({}); }).should.throw();
            (function () { bleCen.findChar([]); }).should.throw();
            (function () { bleCen.findChar('xxx'); }).should.throw();
            (function () { bleCen.findChar(false); }).should.throw();
            (function () { bleCen.findChar(undefined); }).should.throw();
        });
    });
});

describe('Functional Check', function () {
    describe('devmgr', function () {
        it('newDevice()', function () {
            devmgr.newDevice('peripheral', '0x78c5e570796e', 0).should.equal(blePeri);
            devmgr.newDevice('central', '0x78c5e570737f').should.deepEqual(bleCen);
        });

        it('loadDevs() - no device', function () {
            return devmgr.loadDevs().should.be.fulfilledWith([]);
        });

        it('loadDevs() - with device', function () {
            //testing in peripheral scope
        });

        it('findDev()', function () {
            blePeri.connHdl = 0;
            devmgr.findDev('0x78c5e570796e').should.equal(blePeri);
            devmgr.findDev(0).should.equal(blePeri);
        });

        it('stopScan() - scanState is off', function () {
            return devmgr.stopScan().should.be.fulfilledWith();
        });

        it('stopScan() - scanState is on', function () {
            //TODO
        });
    });

    this.timeout(8000);
    describe('peripheral', function () {
        var cloneDev;

        it('connect()', function (done) {
            blePeri.connect().then(function () {
                if (blePeri.state === 'online' && blePeri._isSync === true) {
                    cloneDev = _.cloneDeep(blePeri.expInfo());
                    done();
                }
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('cancelConnect()', function () {
            return blePeri.connect().should.be.rejectedWith('connect timeout');
        });      

        it('disConnect()', function (done) {
            blePeri.disConnect().then(function () {
                if (blePeri.state === 'offline' && _.isNull(blePeri.connHdl))
                    done();
            });
        });

        it('reconnect to device', function () {
            return blePeri.connect().should.be.fulfilled();
        });

        it('loadDevs() - with device', function (done) {
            devmgr.loadDevs().then(function (result) {
                var dev = result[0].expInfo();
                if (_.isEqual(dev, cloneDev))
                    done();
            });
        });

        it('linkParamUpdate()', function (done) {
            var linkParamObj = {
                    interval: 160,
                    latency: 1,
                    timeout:  1800
                },
                recLinkParamObj = {};

            ccBnp.on('ind', function (msg) {
                if (msg.type === 'linkParamUpdate') {
                    recLinkParamObj.interval = msg.data.connInterval;
                    recLinkParamObj.latency = msg.data.connLatency;
                    recLinkParamObj.timeout = msg.data.connTimeout;

                    if (_.isEqual(recLinkParamObj, linkParamObj))
                        done();
                }
            });
            blePeri.linkParamUpdate(160, 1, 1800);
        });

// this.timeout(60000);
//         it('getServs()', function (done) {
//             ccBnp.gap.terminateLink(0, 19).then(function () {
//                 return ccBnp.gap.estLinkReq(0, 0, blePeri.addrType, blePeri.addr);
//             }).then(function () {
//                 return ccBnp.gatt.discAllPrimaryServices(0);
//             }).then(function (result) {
//                 console.log(result);
//                 return ccBnp.gatt.discAllChars(0, 1, 11);
//             }).then(function (result) {
//                 console.log(result);
//                 console.log('0x1800');
//                 return ccBnp.gatt.discAllChars(0, 12, 15);
//             }).then(function (result) {
//                 console.log('0x1801');
//                 console.log(result);
//                 return ccBnp.gatt.discAllChars(0, 16, 34);
//             }).then(function (result) {
//                 console.log('0x180a');
//                 console.log(result);
//                 return ccBnp.gatt.discAllChars(0, 35, 65535);
//             }).then(function (result) {
//                 console.log('0xfff0');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 3, '0x2a00');
//             }).then(function (result) {
//                 console.log('2a00');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 5, '0x2a01');
//             }).then(function (result) {
//                 console.log('2a01');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 7, '0x2a02');
//             }).then(function (result) {
//                 console.log('2a02');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 11, '0x2a04');
//             }).then(function (result) {
//                 console.log('2a04');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 18, '0x2a23');
//             }).then(function (result) {
//                 console.log('2a23');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 20, '0x2a24');
//             }).then(function (result) {
//                 console.log('2a24');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 22, '0x2a25');
//             }).then(function (result) {
//                 console.log('2a25');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 24, '0x2a26');
//             }).then(function (result) {
//                 console.log('2a26');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 27, '0x2a27');
//             }).then(function (result) {
//                 console.log('2a27');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 28, '0x2a28');
//             }).then(function (result) {
//                 console.log('2a28');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 30, '0x2a29');
//             }).then(function (result) {
//                 console.log('2a29');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 32, '0x2a2a');
//             }).then(function (result) {
//                 console.log('2a2a');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 34, '0x2a50');
//             }).then(function (result) {
//                 console.log('2a50');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 37, '0xfff1');
//             }).then(function (result) {
//                 console.log('fff1');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 40, '0xfff2');
//             }).then(function (result) {
//                 console.log('fff2');
//                 console.log(result);
//                 return ccBnp.gatt.readCharValue(0, 50, '0xfff5');
//             }).then(function (result) {
//                 console.log('fff5');
//                 console.log(result);
//                 done();
//             }).fail(function (err) {
//                 console.log(err);
//                 done();
//             });
//         });

        // it('getServs()', function (done) {
        //     // read speed very slow
        //     // blePeri.servs = {};
        //     blePeri.getServs().then(function (result) {
        //         console.log(result);
        //         done();
        //     }).fail(function (err) {
        //         console.log(err);
        //         done();
        //     });
        // });


        it('createSecMdl()', function () {
            blePeri.createSecMdl({}).should.deepEqual(blePeri.sm);
        });

        it('encrypt()', function () {
            blePeri.encrypt()
        });

        it('disConnect()', function () {
            blePeri.disConnect().should.be.fulfilled();
        });
    });

    describe('central', function () {

    });
});