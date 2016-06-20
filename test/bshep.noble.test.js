var expect = require('chai').expect,
    noble = require('noble'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    central = require('../lib/csr8510/ble-shepherd'),
    NoblePeriph = require('../node_modules/noble/lib/peripheral'),
    Peripheral = require('../lib/csr8510/peripheral');

var peripheral = new Peripheral(new NoblePeriph(noble, '11:22:33:44:55:66', '0x112233445566', 0, true, {}, -56));

describe('Signature Check', function () {
    it('central.start(bleApp[, callback])', function () {
        expect(function () { central.start(function () {}); }).to.not.throw();

        expect(function () { central.start({}); }).to.throw('app must be an function');
        expect(function () { central.start([]); }).to.throw('app must be an function');
        expect(function () { central.start('xxx'); }).to.throw('app must be an function');
        expect(function () { central.start(123); }).to.throw('app must be an function');
        expect(function () { central.start(false); }).to.throw('app must be an function');
        expect(function () { central.start(undefined); }).to.throw('app must be an function');
        expect(function () { central.start(null); }).to.throw('app must be an function');
    });

    it('central.setNwkParams(type, setting[, callback])', function () {
        expect(function () { central.setNwkParams('scan', {}); }).to.not.throw();

        expect(function () { central.setNwkParams({}, {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams([], {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams('xxx', {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams(123, {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams(false, {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams(undefined, {}); }).to.throw('type must be a string of scan or link.');
        expect(function () { central.setNwkParams(null, {}); }).to.throw('type must be a string of scan or link.');

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

    it('peripheral.regCharHdlr(uuidServ, uuidChar, hdlr)', function () {
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