var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    fs = require('fs'),
    manager = require('../../lib/csr8510/ble-shepherd'),
    GATTDEFS = require('../../lib/defs/gattdefs');

var dbPath = '../../lib/csr8510/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var periph;

describe('start connection', function () {
    this.timeout(10000);
    it('init', function (done) {
    	manager.start(function () {
                manager.on('IND', function (msg) {
                    if (msg.type === 'DEV_INCOMING') {
                        periph = manager.find(msg.data);
                        done();
                    }
                });
        });
    });
    this.timeout(2000);
});

describe('Constructor Check', function () {
    it('peripheral', function () {
        should(periph.role).be.equal('peripheral');
        should(periph.addr).be.equal('0x544a165e1f53');
        should(periph.state).be.equal('online');
        should(periph.connHdl).be.type('number');
        should(periph.servs).be.type('object');
    });
});

describe('Signature Check', function () {
    it('updateLinkParam(interval, latency, timeout)', function () {
        (function () { periph.updateLinkParam(10, 0, 100); }).should.not.throw();

        (function () { periph.updateLinkParam({}, 0, 100); }).should.throw();
        (function () { periph.updateLinkParam([], 0, 100); }).should.throw();
        (function () { periph.updateLinkParam('xxx', 0, 100); }).should.throw();
        (function () { periph.updateLinkParam(true, 0, 100); }).should.throw();
        (function () { periph.updateLinkParam(undefined, 0, 100); }).should.throw();
        (function () { periph.updateLinkParam(null, 0, 100); }).should.throw();

        (function () { periph.updateLinkParam(10, {}, 100); }).should.throw();
        (function () { periph.updateLinkParam(10, [], 100); }).should.throw();
        (function () { periph.updateLinkParam(10, 'xxx', 100); }).should.throw();
        (function () { periph.updateLinkParam(10, true, 100); }).should.throw();
        (function () { periph.updateLinkParam(10, undefined, 100); }).should.throw();
        (function () { periph.updateLinkParam(10, null, 100); }).should.throw();

        (function () { periph.updateLinkParam(10, 0, {}); }).should.throw();
        (function () { periph.updateLinkParam(10, 0, []); }).should.throw();
        (function () { periph.updateLinkParam(10, 0, 'xxx'); }).should.throw();
        (function () { periph.updateLinkParam(10, 0, true); }).should.throw();
        (function () { periph.updateLinkParam(10, 0, undefined); }).should.throw();
        (function () { periph.updateLinkParam(10, 0, null); }).should.throw();
    });
    
    it('findChar(uuidServ, uuidChar)', function () {
        (function () { periph.findChar('0xaa00', '0xaa01'); }).should.not.throw();

        (function () { periph.findChar({}, '0xaa01'); }).should.throw();
        (function () { periph.findChar([], '0xaa01'); }).should.throw();
        (function () { periph.findChar(123, '0xaa01'); }).should.throw();
        (function () { periph.findChar('xxx', '0xaa01'); }).should.throw();
        (function () { periph.findChar(true, '0xaa01'); }).should.throw();
        (function () { periph.findChar(undefined, '0xaa01'); }).should.throw();
        (function () { periph.findChar(null, '0xaa01'); }).should.throw();

        (function () { periph.findChar('0xaa00', {}); }).should.throw();
        (function () { periph.findChar('0xaa00', []); }).should.throw();
        (function () { periph.findChar('0xaa00', 123); }).should.throw();
        (function () { periph.findChar('0xaa00', 'xxx'); }).should.throw();
        (function () { periph.findChar('0xaa00', true); }).should.throw();
        (function () { periph.findChar('0xaa00', undefined); }).should.throw();
        (function () { periph.findChar('0xaa00', null); }).should.throw();
    });

    it('read(uuidServ, uuidChar, callback)', function () {
        (function () { periph.read('0xaa00', '0xaa01', function () {}); }).should.not.throw();

        (function () { periph.read('0xaa00', '0xaa01', {}); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', []); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', 123); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', 'XXX'); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', true); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', undefined); }).should.throw();
        (function () { periph.read('0xaa00', '0xaa01', null); }).should.throw();
    });

    it('readDesc(uuidServ, uuidChar, callback)', function () {
        (function () { periph.readDesc('0xaa00', '0xaa01', function () {}); }).should.not.throw();

        (function () { periph.readDesc('0xaa00', '0xaa01', {}); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', []); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', 123); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', 'XXX'); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', true); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', undefined); }).should.throw();
        (function () { periph.readDesc('0xaa00', '0xaa01', null); }).should.throw();
    });

    it('regCharHdlr(uuidServ, uuidChar, hdlr)', function () {
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', function () {}); }).should.not.throw();

        (function () { periph.regCharHdlr('0xaa00', '0xaa01', {}); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', []); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', 123); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', 'XXX'); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', true); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', undefined); }).should.throw();
        (function () { periph.regCharHdlr('0xaa00', '0xaa01', null); }).should.throw();
    });
});

describe('Functional Check', function () {
    // not test: discServsAndChars, save
    it('disconnect()', function (done) {
        periph.disconnect(function (err) {
            if (!err) { done(); }
        });
    });

    it('connect()', function (done) {
        periph.connect(function (err) {
            if (!err) { done(); }
        });
    });

    it('updateLinkParam()', function (done) {
        periph.updateLinkParam(8, 0, 100, function (err) {
            if (!err && _.isEqual(periph.linkParams, {interval: 8, latency: 0, timeout: 100})) {
                done();
            }
        });
    });

    it('update()', function (done) {
        periph.update(function () {
            if (!err) { done(); }
        });
    });

    // it('', function () {
    //     var char = periph.servs['0x1800'].chars['0x2a00']
    // });
});