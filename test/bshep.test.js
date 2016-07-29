var _ = require('busyman'),
    expect = require('chai').expect,
    Q = require('q'),
    ccbnp = require('cc-bnp'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    BShepherd = require('../index'),
    Periph = require('../lib/model/peripheral'),
    Serv = require('../lib/model/service'),
    Char = require('../lib/model/characteristic');

var central = new BShepherd('cc-bnp', 'xxx'),
    peripheral = new Periph({ addr: '0x123456789012', addrType: 0 });

    peripheral._controller = central._controller;

describe('Constructor Check', function () {
    it('should has all correct members after new', function () {
        var subModule = 'cc-bnp',
            shepherd = new BShepherd(subModule, 'xxx');

        expect(shepherd._subModule).to.be.equal(subModule);
        expect(shepherd._controller).to.be.an('object');
        expect(shepherd._periphBox).to.be.an('object');
        expect(shepherd._enable).to.be.equal('pending');
        expect(shepherd._resetting).to.be.false;
        expect(shepherd._blockerState).to.be.null;
        expect(shepherd._permitJoinTimer).to.be.null;
        expect(shepherd._spCfg).to.be.deep.equal({ path: 'xxx', options: undefined });
        expect(shepherd._plugins).to.be.an('object');

        expect(shepherd.bleCentral).to.be.null;
        expect(shepherd.init).to.be.a('function');
        expect(shepherd.setScanRule).to.be.a('function');

        expect(shepherd.setPermitJoinTime).to.be.a('function');
        expect(shepherd.getPermitJoinTime).to.be.a('function');
        expect(shepherd.joinTimeCountdown).to.be.a('function');
        expect(shepherd.isBlackListed).to.be.a('function');
        expect(shepherd.ban).to.be.a('function');
        expect(shepherd.unban).to.be.a('function');
        expect(shepherd.isWhiteListed).to.be.a('function');
        expect(shepherd.allow).to.be.a('function');
        expect(shepherd.disallow).to.be.a('function');
        expect(shepherd._ban).to.be.a('function');
        expect(shepherd._unban).to.be.a('function');
        expect(shepherd._onSignin).to.be.a('function');
        expect(shepherd._onAsyncExit).to.be.a('function');
    });

    it('should throw if subModule given with cc-bnp or noble', function () {
        expect(function () { new BShepherd('cc-bnp', 'xxx'); }).to.not.throw();

        expect(function () { new BShepherd({}); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd([]); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd('xxx'); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(123); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(false); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(undefined); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(null); }).to.throw('subModule must be given with cc-bnp or noble');
    });

    it('should throw if path not given with string with cc-bnp', function () {
        expect(function () { new BShepherd('cc-bnp'); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', {}); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', []); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', 123); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', false); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', undefined); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', null); }).to.throw('path must be given in string');

        ccbnp.removeAllListeners('ind');
    });
});

describe('Signature Check', function() {
    it('central.setNwkParams(type, setting[, callback])', function () {
        expect(function () { central.setNwkParams('scan', {}); }).to.not.throw();

        expect(function () { central.setNwkParams({}, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams([], {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams('xxx', {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(123, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(false, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(undefined, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(null, {}); }).to.throw('type must be a string of scan or link');

        expect(function () { central.setNwkParams('link', []); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', 'xxx'); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', 123); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', false); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', undefined); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', null); }).to.throw('setting must be an object.');
    });

    it('central.permitJoin(duration)', function () {
        expect(function () { central.permitJoin(60); }).to.not.throw();

        expect(function () { central.permitJoin({}); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin([]); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin('xxx'); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(false); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(undefined); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(null); }).to.throw('duration must be a number');
    });

    it('central.find(addrOrHdl)', function () {
        expect(function () { central.find(''); }).to.not.throw();
        expect(function () { central.find(0); }).to.not.throw();

        expect(function () { central.find({}); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find([]); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(false); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(undefined); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(null); }).to.throw('addrOrHdl must be a string or a number');
    });

    it('central.regGattDefs(type, regObjs)', function () {
        expect(function () { central.regGattDefs('service', {}); }).to.not.throw();

        expect(function () { central.regGattDefs({}, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs([], {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs('xxx', {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(123, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(true, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(undefined, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(null, {}); }).to.throw('type must be service or characteristic.');

        expect(function () { central.regGattDefs('service', 'xxx'); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', 123); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', true); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', undefined); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', null); }).to.throw('regObjs must be an object or an array');
    });

    it('central.registerPlugin(devName, plugin)', function () {
        expect(function () { central.regPlugin('relay', { examine: function() {} }); }).to.not.throw();

        expect(function () { central.regPlugin({}, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin([], { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(123, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(true, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(undefined, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(null, { examine: function() {} }); }).to.throw('devName should be a string');

        expect(function () { central.regPlugin('switch', {}); }).to.throw('You should provide examine function');
        expect(function () { central.regPlugin('switch', []); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', 'xxx'); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', 123); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', true); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', undefined); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', null); }).to.throw('plugin should be an object');
    });

    it('central.addLocalServ(servInfo[, callback])', function () {
        expect(function () { central.regLocalServ([]); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(123); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ('xxx'); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(true); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(undefined); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(null); }).to.throw('servInfo must be an object');

        expect(function () { central.regLocalServ({ charsInfo: {} }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: 123 }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: 'xxx' }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: true }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: undefined }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: null }); }).to.throw('servInfo.charsInfo must be an array.');

        expect(function () { central.regLocalServ({ charsInfo: [], uuid: {} }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: [] }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: 123 }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: true }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: undefined }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: null }); }).to.throw('servInfo.uuid must be a string and start with 0x');
    });

    // peripheral
    it('peripheral.updateLinkParam(interval, latency, timeout[, callback])', function () {
        expect(function () { peripheral.updateLinkParam(10, 20, 30); }).to.not.throw();

        expect(function () { peripheral.updateLinkParam({}, 20, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam([], 20, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam('xxx', 20, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(true, 20, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(undefined, 20, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(null, 20, 30); }).to.throw('interval, latency and timeout must be number.');

        expect(function () { peripheral.updateLinkParam(10, {}, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, [], 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 'xxx', 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, true, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, undefined, 30); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, null, 30); }).to.throw('interval, latency and timeout must be number.');

        expect(function () { peripheral.updateLinkParam(10, 20, {}); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 20, []); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 20, 'xxx'); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 20, true); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 20, undefined); }).to.throw('interval, latency and timeout must be number.');
        expect(function () { peripheral.updateLinkParam(10, 20, null); }).to.throw('interval, latency and timeout must be number.');

    });

    it('peripheral.encrypt(setting[, callback])', function () {
        expect(function () { peripheral.encrypt({}); }).to.not.throw();
        expect(function () { peripheral.encrypt(); }).to.not.throw();

        expect(function () { peripheral.encrypt([]); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt('xxx'); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt(123); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt(true); }).to.throw('setting must be an object');
    });

    it('peripheral.findChar(uuidServ, uuidChar)', function () {
        peripheral.servs['0x1800'] = {};

        expect(function () { peripheral.findChar('0x1800', '0x2a00'); }).to.not.throw();

        expect(function () { peripheral.findChar({}, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar([], '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(123, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar('xxx', '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(true, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(undefined, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(null, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');

        expect(function () { peripheral.findChar('0x1800', {}); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', []); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', 'xxx'); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', undefined); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', true); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', null); }).to.throw('uuidChar must be a number or a string start with 0x');
    });

    it('peripheral.regCharHdlr(uuidServ, uuidChar, fn)', function () {
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', function () {}); }).to.not.throw();

        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', {}); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', []); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', 123); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', 'xxx'); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', true); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', undefined); }).to.throw('fn must be a function');
        expect(function () { peripheral.regCharHdlr('0x1800', '0x2a00', null); }).to.throw('fn must be a function');

    });
});

describe('Functional Check', function () {
    this.timeout(5000);

    var periph1 = new Periph({ addr: '0x123456789012', addrType: 0 }),
        periph2 = new Periph({ addr: '0x112233445566', addrType: 1 }),
        periph3 = new Periph({ addr: '0x665544332211', addrType: 2});

    describe('central', function () {
        it('permitJoin()', function (done) {
            var checkCount = 0,
                duration = 2;

            central.on('IND', function (msg) {
                if (msg.type === 'NWK_PERMITJOIN') {
                    if (msg.data === 0 | msg.data === duration)
                        checkCount += 1;

                    if (checkCount === 2) done();
                }
            });

            central.permitJoin(duration);
        });

        it('listDevices()', function (done) {
            var result;

            central.regPeriph(periph1).then(function () {
                return central.regPeriph(periph2);
            }).then(function () {
                return central.regPeriph(periph3);
            }).then(function () {
                result = central.listDevices();
                if (result.length === 3)
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('find()', function () {
            var result = central.find(periph1.addr);

            expect(result).to.be.deep.equal(periph1);
        });

        it('regGattDefs()', function () {
            var toRegServ = [{name: 'Test', uuid: '0xFFF0'}];

            expect(central.regGattDefs('service', toRegServ)).to.be.deep.equal(central);
            expect(GATTDEFS.ServUuid.get(0xfff0)).to.be.a('object');
        });

        it('registerPlugin()', function () {
            var plugin = {
                examine: function () {

                },
                gattDefs: {
                    service: [{name: 'Test2', uuid: '0xFFF1'}]
                }
            };

            expect(central.regPlugin('xxx', plugin)).to.be.true;
            expect(central._plugins['xxx']).to.be.deep.equal(plugin.examine);
            expect(GATTDEFS.ServUuid.get(0xfff1)).to.be.a('object');
        });

        it('blocker()', function () {
            expect(central.blocker(true)).to.be.deep.equal(central);
            expect(central._blockerState).to.be.equal('black');

            expect(central.blocker(true, 'white')).to.be.deep.equal(central);
            expect(central._blockerState).to.be.equal('white');

            expect(central.blocker(false)).to.be.deep.equal(central);
            expect(central._blockerState).to.be.null;
        });

        it('ban()', function (done) {
            var addr = '0x111111111111';

            central.blocker(true);
            central.ban(addr, function (err) {
                if (!err && central.isBlackListed(addr)) done();
            });
        });

        it('unban()', function (done) {
            central.unban('0x111111111111', function (err) {
                if (!err && !central.isBlackListed('0x111111111111')) done();
            });
        });

        it('allow()', function (done) {
            var addr = '0x111111111111';

            central.blocker(true, 'white');
            central.allow(addr, function (err) {
                if (!err && central.isWhiteListed(addr)) done();
            });
        });

        it('disallow()', function (done) {
            central.disallow('0x111111111111', function (err) {
                if (!err && !central.isWhiteListed('0x111111111111')) done();
            });
        });
    });

    // var periph = devmgr.newDevice('peripheral', '0x123456789012', 0),
        generalFunc = function () {
            var deferred = Q.defer();

            deferred.resolve();
            return deferred.promise;
        };
    describe('peripheral', function () {
        var servInfo = {
            uuid: '0x1800',
            startHdl: 1,
            endHdl: 20,
            chars: [ 
                {
                    uuid: '0x2a00',
                    hdl: 2,
                    prop: ['read']
                }
            ]
        };

        peripheral.servs['0x1800'] = new Serv(servInfo, peripheral);

        it('connect()', function (done) {
            var originalEstLinkReq = ccbnp.gap.estLinkReq,
                originalDiscCancel = ccbnp.gap.deviceDiscCancel();

            ccbnp.gap.estLinkReq = function (dutyCycle, whiteList, addrType, addr) {
                var deferred = Q.defer();

                ccbnp.emit('ind', { type: 'linkEstablished', data: { addr: '0x123456789012', connHandle: 0, connInterval: 10, connLatency: 20, connTimeout: 30 }});

                deferred.resolve({collector: {GapLinkEstablished: [{addr: '0x123456789012'}]}});
                return deferred.promise;
            };

            ccbnp.gap.deviceDiscCancel = generalFunc;

            peripheral.status = 'idle';
            peripheral.connect(function (err) {
                if (!err) {
                    ccbnp.gap.estLinkReq = originalEstLinkReq;
                    ccbnp.gap.deviceDiscCancel = originalDiscCancel;
                    done();
                }
            });
        });

        it('disconnect()', function (done) {
            var originalDiscCancel = ccbnp.gap.deviceDiscCancel,
                originalTermLink = ccbnp.gap.terminateLink;
            
            ccbnp.gap.deviceDiscCancel = ccbnp.gap.terminateLink = generalFunc;

            setTimeout(function () {
                peripheral.disconnect(function (err) {
                    if (!err && !peripheral.connHdl && peripheral.status === 'offline') {
                        ccbnp.gap.deviceDiscCancel = originalDiscCancel;
                        ccbnp.gap.terminateLink = originalTermLink;
                        done();
                    }
                });
            }, 100);
            
        });

        it('updateLinkParam()', function (done) {
            var originalUpdateLinkParamReq = ccbnp.gap.updateLinkParamReq,
                originalCentralFind = central.find;

            ccbnp.gap.updateLinkParamReq = function () {
                var deferred = Q.defer();

                ccbnp.emit('ind', {type: 'linkParamUpdate', data: {connHandle: 0, connInterval: 20, connLatency: 40, connTimeout: 60}});
                deferred.resolve();

                return deferred.promise;
            };

            central.find = function () {
                return peripheral;
            };

            peripheral.status = 'online';
            peripheral.connHdl = 0;
            peripheral.updateLinkParam(20, 40, 60, function (err) {
                if (!err) {
                    setTimeout(function () {
                        if (_.isEqual(peripheral.linkParams, { interval: 20, latency: 40, timeout: 60 })) {
                            ccbnp.gap.updateLinkParamReq = originalUpdateLinkParamReq;
                            central.find = originalCentralFind;
                            done();
                        }
                    }, 50);
                }
            });
        });

        it('findChar()', function () {
            peripheral.servs['0x1800'] = new Serv(servInfo, peripheral);
            expect(peripheral.findChar('0x1800', '0x2a00')).to.be.deep.equal(peripheral.servs['0x1800'].chars['2']);

        });

        it('regCharHdlr()', function () {
            var hdlr = function () {};

            expect(peripheral.regCharHdlr('0x1800', '0x2a00', hdlr)).to.be.deep.equal(peripheral);
            expect(peripheral.servs['0x1800'].chars['2'].processInd).to.be.equal(hdlr);
        });

        it('readDesc()', function (done) {
            var originalReadChar = ccbnp.gatt.readUsingCharUuid,
                newChar = new Char({ uuid: '0x2a03', hdl: 25, prop: ['read', 'write', 'notify'] }, peripheral.servs['0x1800']);

            _.set(peripheral, 'servs.0x1800.chars.25', newChar);

            ccbnp.gatt.readUsingCharUuid = function () {
                var deferred = Q.defer();

                deferred.resolve({collector: {AttReadByTypeRsp: [{data: {attrVal0: 'testChar'}}]}});

                return deferred.promise;
            };

            peripheral.readDesc('0x1800', '0x2a03', function (err, result) {
                if (result === 'testChar' && newChar.desc === 'testChar') {
                    ccbnp.gatt.readUsingCharUuid = originalReadChar;
                    done();
                }
            });
        });

        it('setNotify() - unable to set', function (done) {
            var newChar = new Char({ uuid: '0x2a04', hdl: 28, prop: [] }, peripheral.servs['0x1800']);

            _.set(peripheral, 'servs.0x1800.chars.28', newChar);

            peripheral.setNotify('0x1800', '0x2a04', true, function (err) {
                if (err.message === 'Characteristic not allowed to notify or indication') 
                    done();
            });
        });

        it('setNotify()', function (done) {
            var originalReadCfg = ccbnp.gatt.readUsingCharUuid,
                originalWriteChar = ccbnp.gatt.writeCharValue,
                flag;

            ccbnp.gatt.readUsingCharUuid = function () {
                var deferred = Q.defer();

                deferred.resolve({collector: {AttReadByTypeRsp: [{data: {attrHandle0: 15}}]}});

                return deferred.promise;
            };

            ccbnp.gatt.writeCharValue = function () {
                var deferred = Q.defer();

                if (arguments[0] === 0 && arguments[1] === 15 && _.isEqual(arguments[2], {properties: 0x0001}) )
                    flag = true;
                deferred.resolve();

                return deferred.promise;
            };

            peripheral.setNotify('0x1800', '0x2a03', true, function (err) {
                if (!err && flag) {
                    ccbnp.gatt.readUsingCharUuid = originalReadCfg;
                    ccbnp.gatt.writeCharValue = originalWriteChar;
                    done();
                }
            });
        });

        it('read() - unable to set', function (done) {
            peripheral.read('0x1800', '0x2a04', function (err) {
                if (err.message === 'Characteristic value not allowed to read.')
                    done();
            });
        });

        it('read()', function (done) {
            var originalRead = ccbnp.gatt.readCharValue,
                char = peripheral.findChar('0x1800', '0x2a03'),
                flag;

            ccbnp.gatt.readCharValue = function () {
                var deferred = Q.defer();

                if (arguments[0] === 0 && arguments[1] === 25 && arguments[2] === '0x2a03')
                    flag = true;

                deferred.resolve({collector: {AttReadRsp: [{value: 'readVal'}]}});

                return deferred.promise;
            };

            peripheral.read('0x1800', '0x2a03', function (err, result) {
                if (err) {
                    console.log(err);
                } else if (result === 'readVal' && char.val === 'readVal') {
                    ccbnp.gatt.readCharValue = originalRead;
                    done();
                }
            });
        });

        it('write() - unable to write', function (done) {
            peripheral.write('0x1800', '0x2a04', new Buffer([0]), function (err) {
                if (err.message === 'Characteristic value not allowed to write.')
                    done();
            });
        });

        it('write()', function (done) {
            var originalWrite = ccbnp.gatt.writeCharValue,
                char = peripheral.findChar('0x1800', '0x2a03'),
                writeVal = { onOff: true };

            ccbnp.gatt.writeCharValue = generalFunc;

            peripheral.write('0x1800', '0x2a03', writeVal, function (err) {
                if (err) {
                    console.log(err);
                } else if (char.val === writeVal) {
                    ccbnp.gatt.writeCharValue = originalWrite;
                    done();
                }
            });
        });
    });
});