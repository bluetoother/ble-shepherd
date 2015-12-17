var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    fs = require('fs'),
    Devmgr = require('../lib/management/devmgr'),
    devmgr = new Devmgr(),
    bledb = require('../lib/bledb'),
    BleServ = require('../lib/service/bleServConstr');

var dbPath = '../lib/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var blePeri = devmgr.newDevice('peripheral', '0x78c5e570796e', 0),
    bleCen = devmgr.newDevice('central', '0x78c5e570737f');

var pubCharsInfo = [
        {uuid: '0x2a00', permit: 1, prop: 2, val: {DeviceName:"Simple BLE Central"}},
        {uuid: '0x2a01', permit: 1, prop: 2, val: {Appearance:0}},
        {uuid: '0x2a02', permit: 3, prop: 10, val: {PeripheralPrivacyFlag: 0}},
        {uuid: '0x2a04', permit: 1, prop: 2, val: {MinConnInterval:80, MaxConnInterval:160, Latency:0, Timeout:1000}},
    ],
    pubServ = new BleServ('0x1800', pubCharsInfo);

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
                    interval: 80,
                    latency: 0,
                    timeout:  1000
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
            blePeri.linkParamUpdate(80, 0, 1000);
        });

        it('_getServs()', function () {
            return blePeri._getServs().should.be.fulfilled();
        });

        it('createSecMdl()', function () {
            blePeri.createSecMdl({}).should.deepEqual(blePeri.sm);
        });

        var authed = false;
        it('encrypt()', function (done) {
            ccBnp.on('ind', function (msg) {
                if (msg.type === 'authenComplete') { authed = true; }
                if (blePeri.sm.bond === 1) {
                    if (authed && msg.type === 'bondComplete') 
                        done();
                } else {
                    if (authed) { done(); }
                }
                
            });
            blePeri.encrypt();
        });

        it('expInfo()', function () {
            var dev = _.cloneDeep(blePeri);
            var sm = blePeri.sm.expInfo();
            var servs = [];

            _.forEach(dev.servs, function (serv) {
                servs.push(serv.uuid);
            });
            delete dev._isSync;
            delete dev.ownerDevmgr;
            delete dev.state;
            delete dev.connHdl;
            dev.sm = sm;
            dev.servs = servs;

            blePeri.expInfo().should.deepEqual(dev);
        });

        it('loadServs()', function (done) {
            var servs = {},
                newServs = {};
            _.forEach(blePeri.servs, function (serv, name) {
                servs[name] = serv.expInfo();
            });

            blePeri.servs = {};
            blePeri.loadServs().then(function () {
                _.forEach(blePeri.servs, function (serv, name) {
                    newServs[name] = serv.expInfo();
                });
                if (_.isEqual(servs, newServs))
                    done();
            });
        });

        it('update()', function (done) {
            blePeri.update().then(function () {
                if (blePeri._isSync === true)
                    done();
            });
        });

        it('remove()', function (done) {
            var flag = false;
            blePeri.remove().then(function () {
                return bledb.getInfo('device');
            }).then(function (result) {
                _.forEach(result, function (dev) {
                    if (dev._id === blePeri._id) {
                        flag = ture;
                    }
                });
                if (!flag)
                    done();
            });
        });

        it('save()',function (done) {
            var flag = false;
            blePeri.save().then(function () {
                return bledb.getInfo('device');
            }).then(function (result) {
                _.forEach(result, function (dev) {
                    if (dev._id === blePeri._id) {
                        flag = true;
                    }
                });
                if (flag)
                    done();
            });
        });

        it('disConnect()', function () {
            blePeri.disConnect().should.be.fulfilled();
        });
    });

    describe('central', function () {
        it('regServ()', function (done) {
            bleCen.regServ(pubServ).then(function () {
                if (_.isEqual(bleCen.servs[0], pubServ))
                    done();
            });
        });

        it('findChar()', function () {
            bleCen.findChar(pubServ.chars['0x2a00'].attrs[0].hdl)
                .should.deepEqual(pubServ.chars['0x2a00']);
        });

        it('getAllAttrs()', function () {
            bleCen.getAllAttrs().should.deepEqual(pubServ.getAttrs());
        });

        it('_processAttMsg()', function () {
            //TODO
        });

        it('delServ', function (done) {
            bleCen.delServ(bleCen.servs[0].startHdl).then(function () {
                if (_.isEmpty(bleCen.servs))
                    done();
            });
        });
    });
});