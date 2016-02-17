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
                manager.once('IND', function (msg) {
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

    this.timeout(2500);
    it('connect()', function (done) {
        manager.on('IND', function (msg) {
            if (msg.type === 'DEV_INCOMING' && msg.data === periph.addr) {
                done();
            }
        });

        periph.connect();
    });

    it('updateLinkParam()', function (done) {
        periph.updateLinkParam(8, 0, 100, function (err) {
            if (!err && _.isEqual(periph.linkParams, {interval: 8, latency: 0, timeout: 100})) {
                done();
            }
        });
    });

    this.timeout(5000);
    it('update()', function (done) {
        periph.update(function (err) {
            if (!err) { done(); }
        });
    });

    it('findChar()', function () {
        var char = periph.servs['0x1800'].chars['0x2a00'];
        periph.findChar('0x1800', '0x2a00').should.deepEqual(char);
    });

    it ('read()', function (done) {
        periph.read('0x1800', '0x2a00', function (err, data) {
            if (!err) {
                if (_.isEqual(data, {name:"TI BLE Keyfob"})) {
                    done();
                }
            }
        });
    });

    it('readDesc()', function (done) {
        periph.readDesc('0x1800', '0x2a00', function (err, desc) {
            if (!err) {
                if (_.isEqual(desc, { userDescription: 'TI BLE Keyfob' })) {
                    done();
                }
            }
        });
    });

    it('write()', function (done) {
        var writeVal = new Buffer([0]);

        periph.write('0xffa0', '0xffa1', writeVal, function (err) {
            if (!err) {
                periph.read('0xffa0', '0xffa1', function (err, data) {
                    if (_.isEqual(data, writeVal)) {
                        done();
                    }
                });
            }
        });
    });

    it('setNotify()', function (done) {
        periph.setNotify('0xffe0', '0xffe1', true, function (err) {
            if (!err) { done(); }
        });
    });

    it('regCharHdlr', function (done) {
        periph.regCharHdlr('0xffe0', '0xffe1', function (data) {
            console.log(data);
            done();
        });
    });
});