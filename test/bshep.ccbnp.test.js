var _ = require('lodash'),
    expect = require('chai').expect,
    Q = require('q'),
    ccbnp = require('cc-bnp'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    central = require('../lib/cc254x/ble-shepherd'),
    devmgr = require('../lib/cc254x/management/devmgr'),
    Char = require('../lib/cc254x/management/characteristic');

var peripheral = devmgr.newDevice('peripheral', '0x123456789012', 0);

describe('Signature Check', function() {
    // central
    it('central.start(bleApp, spCfg[, callback])', function () {
        expect(function () { central.start(function () {}, { path: 'ttyACM0' }); }).to.not.throw();

        expect(function () { central.start({}, { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start([], { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start('xxx', { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start(123, { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start(false, { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start(undefined, { path: 'ttyACM0' }); }).to.throw('app must be an function');
        expect(function () { central.start(null, { path: 'ttyACM0' }); }).to.throw('app must be an function');

        expect(function () { central.start(function () {}, {}); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, []); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, 'xxx'); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, 123); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, false); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, undefined); }).to.throw('spConfig must be an object and should have path property');
        expect(function () { central.start(function () {}, null); }).to.throw('spConfig must be an object and should have path property');
    });

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
        expect(function () { central.registerPlugin('relay', { examine: function() {} }); }).to.not.throw();

        expect(function () { central.registerPlugin({}, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.registerPlugin([], { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.registerPlugin(123, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.registerPlugin(true, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.registerPlugin(undefined, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.registerPlugin(null, { examine: function() {} }); }).to.throw('devName should be a string');

        expect(function () { central.registerPlugin('switch', {}); }).to.throw('You should provide examine function');
        expect(function () { central.registerPlugin('switch', []); }).to.throw('plugin should be an object');
        expect(function () { central.registerPlugin('switch', 'xxx'); }).to.throw('plugin should be an object');
        expect(function () { central.registerPlugin('switch', 123); }).to.throw('plugin should be an object');
        expect(function () { central.registerPlugin('switch', true); }).to.throw('plugin should be an object');
        expect(function () { central.registerPlugin('switch', undefined); }).to.throw('plugin should be an object');
        expect(function () { central.registerPlugin('switch', null); }).to.throw('plugin should be an object');
    });

    it('central.addLocalServ(servInfo[, callback])', function () {
        expect(function () { central.addLocalServ([]); }).to.throw('servInfo must be an object');
        expect(function () { central.addLocalServ(123); }).to.throw('servInfo must be an object');
        expect(function () { central.addLocalServ('xxx'); }).to.throw('servInfo must be an object');
        expect(function () { central.addLocalServ(true); }).to.throw('servInfo must be an object');
        expect(function () { central.addLocalServ(undefined); }).to.throw('servInfo must be an object');
        expect(function () { central.addLocalServ(null); }).to.throw('servInfo must be an object');

        expect(function () { central.addLocalServ({ charsInfo: {} }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.addLocalServ({ charsInfo: 123 }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.addLocalServ({ charsInfo: 'xxx' }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.addLocalServ({ charsInfo: true }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.addLocalServ({ charsInfo: undefined }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.addLocalServ({ charsInfo: null }); }).to.throw('servInfo.charsInfo must be an array.');

        expect(function () { central.addLocalServ({ charsInfo: [], uuid: {} }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.addLocalServ({ charsInfo: [], uuid: [] }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.addLocalServ({ charsInfo: [], uuid: 123 }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.addLocalServ({ charsInfo: [], uuid: true }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.addLocalServ({ charsInfo: [], uuid: undefined }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.addLocalServ({ charsInfo: [], uuid: null }); }).to.throw('servInfo.uuid must be a string and start with 0x');
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
        expect(function () { peripheral.findChar('0x1800', '0x2a00'); }).to.not.throw();

        expect(function () { peripheral.findChar({}, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar([], '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(123, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar('xxx', '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(true, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(undefined, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(null, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');

        expect(function () { peripheral.findChar('0x1800', {}); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', []); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', 123); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', 'xxx'); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', undefined); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', true); }).to.throw('uuidChar must be a string and start with 0x');
        expect(function () { peripheral.findChar('0x1800', null); }).to.throw('uuidChar must be a string and start with 0x');
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

    describe('central', function () {
        it('permitJoin()', function (done) {
            var checkCount = 0,
                duration = 2;

            central.on('IND', function (msg) {
                if (msg.type === 'NWK_PERMITJOIN') {
                    if (msg.data === 0 | msg.data === duration)
                        checkCount += 1;

                    if (checkCount === 3) done();
                }
            });

            central.permitJoin(duration);
            if (central._permitState === 'on') checkCount += 1;
        });

        it('listDevices()', function () {
            var devList,
                result,
                periph1 = devmgr.newDevice('peripheral', '0x123456789012', 0),
                periph2 = devmgr.newDevice('peripheral', '0x112233445566', 1),
                periph3 = devmgr.newDevice('peripheral', '0x665544332211', 2);

            result = central.listDevices();
            devList = [periph1.dump(), periph2.dump(), periph3.dump()];

            expect(result).to.be.deep.equal(devList);
        });

        it('find()', function () {
            var result,
                periph1 = devmgr.newDevice('peripheral', '0x123456789012', 0),
                periph2 = devmgr.newDevice('peripheral', '0x112233445566', 1),
                periph3 = devmgr.newDevice('peripheral', '0x665544332211', 2);

            result = central.find(periph1.addr);

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

            expect(central.registerPlugin('xxx', plugin)).to.be.true;
            expect(central._plugins['xxx']).to.be.deep.equal(plugin.examine);
            expect(GATTDEFS.ServUuid.get(0xfff1)).to.be.a('object');
        });

        it('blocker()', function () {
            expect(central.blocker(true)).to.be.deep.equal(central);
            expect(central._blackOrWhite).to.be.equal('black');

            expect(central.blocker(true, 'white')).to.be.deep.equal(central);
            expect(central._blackOrWhite).to.be.equal('white');

            expect(central.blocker(false)).to.be.deep.equal(central);
            expect(central._blackOrWhite).to.be.null;
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
                if (!err && !central.isBlackListed('0x111111111111')) done();
            });
        });
    });

    var periph = devmgr.newDevice('peripheral', '0x123456789012', 0),
        generalFunc = function () {
            var deferred = Q.defer();

            deferred.resolve();
            return deferred.promise;
        };
    describe('peripheral', function () {
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

            periph.state = 'pause';
            periph.connect(function (err) {
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
                periph.disconnect(function (err) {
                    if (!err && !periph.connHdl && periph.state === 'offline') {
                        ccbnp.gap.deviceDiscCancel = originalDiscCancel;
                        ccbnp.gap.terminateLink = originalTermLink;
                        done();
                    }
                });
            }, 100);
            
        });

        it('updateLinkParam()', function (done) {
            var originalUpdateLinkParamReq = ccbnp.gap.updateLinkParamReq;

            ccbnp.gap.updateLinkParamReq = function () {
                var deferred = Q.defer();

                ccbnp.emit('ind', {type: 'linkParamUpdate', data: {connHandle: 0, connInterval: 20, connLatency: 40, connTimeout: 60}});
                deferred.resolve();

                return deferred.promise;
            };

            periph.state = 'online';
            periph.connHdl = 0;
            periph.updateLinkParam(20, 40, 60, function (err) {
                if (!err) {
                    if (_.isEqual(periph.linkParams, { interval: 20, latency: 40, timeout: 60 })); 
                        done();
                }
            });
        });

        it('findChar()', function () {
            var chars = {
                    '0x2a00': { uuid: '0x2a00' },
                    '0x2a01': { uuid: '0x2a01' },
                    '0x2a02': { uuid: '0x2a02' }
                };

            _.set(periph.servs, '0x1800.chars', chars);

            expect(periph.findChar('0x1800', '0x2a00')).to.be.deep.equal(chars['0x2a00']);
            expect(periph.findChar('0x1800', '0x2a01')).to.be.deep.equal(chars['0x2a01']);

        });

        it('regCharHdlr()', function () {
            var hdlr = function () {};

            expect(periph.regCharHdlr('0x1800', '0x2a02', hdlr)).to.be.deep.equal(periph);
            expect(periph.servs['0x1800'].chars['0x2a02'].processInd).to.be.equal(hdlr);
        });

        it('readDesc()', function (done) {
            var originalReadChar = ccbnp.gatt.readUsingCharUuid,
                newChar = new Char({ uuid: '0x2a03', hdl: 25, prop: ['read', 'write', 'notify'] });

            _.set(periph, 'servs.0x1800.chars.0x2a03', newChar);
            _.set(newChar, '_ownerServ', periph.servs['0x1800']);
            _.set(newChar, '_ownerServ._ownerDev', periph);

            ccbnp.gatt.readUsingCharUuid = function () {
                var deferred = Q.defer();

                deferred.resolve({collector: {AttReadByTypeRsp: [{data: {attrVal0: 'testChar'}}]}});

                return deferred.promise;
            };

            periph.readDesc('0x1800', '0x2a03', function (err, result) {
                if (result === 'testChar' && newChar.desc === 'testChar') {
                    ccbnp.gatt.readUsingCharUuid = originalReadChar;
                    done();
                }
            });
        });

        it('setNotify() - unable to set', function (done) {
            var newChar = new Char({ uuid: '0x2a04', hdl: 28, prop: [] });

            _.set(periph, 'servs.0x1800.chars.0x2a04', newChar);
            _.set(newChar, '_ownerServ', periph.servs['0x1800']);
            _.set(newChar, '_ownerServ._ownerDev', periph);

            periph.setNotify('0x1800', '0x2a04', true, function (err) {
                if (err.message === 'Characteristic can\'t Notif or Ind') 
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

            periph.setNotify('0x1800', '0x2a03', true, function (err) {
                if (!err && flag) {
                    ccbnp.gatt.readUsingCharUuid = originalReadCfg;
                    ccbnp.gatt.writeCharValue = originalWriteChar;
                    done();
                }
            });
        });

        it('read() - unable to set', function (done) {
            periph.read('0x1800', '0x2a04', function (err) {
                if (err.message === 'Characteristic value not allowed to read.')
                    done();
            });
        });

        it('read()', function (done) {
            var originalRead = ccbnp.gatt.readCharValue,
                char = periph.findChar('0x1800', '0x2a03'),
                flag;

            ccbnp.gatt.readCharValue = function () {
                var deferred = Q.defer();

                if (arguments[0] === 0 && arguments[1] === 25 && arguments[2] === '0x2a03')
                    flag = true;

                deferred.resolve({collector: {AttReadRsp: [{value: 'readVal'}]}});

                return deferred.promise;
            };

            periph.read('0x1800', '0x2a03', function (err, result) {
                if (err) {
                    console.log(err);
                } else if (result === 'readVal' && char.val === 'readVal') {
                    ccbnp.gatt.readCharValue = originalRead;
                    done();
                }
            });
        });

        it('write() - unable to write', function (done) {
            periph.write('0x1800', '0x2a04', new Buffer([0]), function (err) {
                if (err.message === 'Characteristic value not allowed to write.')
                    done();
            });
        });

        it('write()', function (done) {
            var originalWrite = ccbnp.gatt.writeCharValue,
                char = periph.findChar('0x1800', '0x2a03'),
                writeVal = { onOff: true };

            ccbnp.gatt.writeCharValue = generalFunc;

            periph.write('0x1800', '0x2a03', writeVal, function (err) {
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
