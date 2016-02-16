var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    fs = require('fs'),
    manager = require('../../lib/csr8510/ble-shepherd'),
    GATTDEFS = require('../../lib/defs/gattdefs'),
    hciCharMeta = require('../../lib/csr8510/characteristic/HciCharMeta');

var dbPath = '../lib/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

describe('Signature Check', function () {
    it('permitJoin(time)', function () {
        (function () { manager.permitJoin(123); }).should.not.throw();

        (function () { manager.permitJoin({}); }).should.throw();
        (function () { manager.permitJoin([]); }).should.throw();
        (function () { manager.permitJoin('xxx'); }).should.throw();
        (function () { manager.permitJoin(false); }).should.throw();
        (function () { manager.permitJoin(undefined); }).should.throw();
        (function () { manager.permitJoin(null); }).should.throw();
    });

    it('find(addrOrHdl)', function () {
        (function () { manager.find(123); }).should.not.throw();
        (function () { manager.find('xxx'); }).should.not.throw();

        (function () { manager.find({}); }).should.throw();
        (function () { manager.find([]); }).should.throw();
        (function () { manager.find(false); }).should.throw();
        (function () { manager.find(undefined); }).should.throw();
        (function () { manager.find(null); }).should.throw();
    });

    it('regGattDefs(type, regObjs)', function () {
        (function () { manager.regGattDefs('service', {}); }).should.not.throw();
        (function () { manager.regGattDefs('characteristic', {}); }).should.not.throw();

        (function () { manager.regGattDefs({}, {}); }).should.throw();
        (function () { manager.regGattDefs([], {}); }).should.throw();
        (function () { manager.regGattDefs('xxx', {}); }).should.throw();
        (function () { manager.regGattDefs(123, {}); }).should.throw();
        (function () { manager.regGattDefs(true, {}); }).should.throw();
        (function () { manager.regGattDefs(undefined, {}); }).should.throw();
        (function () { manager.regGattDefs(null, {}); }).should.throw();

        (function () { manager.regGattDefs('service', 'xxx'); }).should.throw();
        (function () { manager.regGattDefs('service', 123); }).should.throw();
        (function () { manager.regGattDefs('service', true); }).should.throw();
        (function () { manager.regGattDefs('service', undefined); }).should.throw();
        (function () { manager.regGattDefs('service', null); }).should.throw();
    });

    it('setNwkParams(type, setting)', function () {
        (function () { manager.setNwkParams({}, {}); }).should.throw();
        (function () { manager.setNwkParams([], {}); }).should.throw();
        (function () { manager.setNwkParams('xxx', {}); }).should.throw();
        (function () { manager.setNwkParams(123, {}); }).should.throw();
        (function () { manager.setNwkParams(true, {}); }).should.throw();
        (function () { manager.setNwkParams(undefined, {}); }).should.throw();
        (function () { manager.setNwkParams(null, {}); }).should.throw();

        (function () { manager.setNwkParams('scan', []); }).should.throw();
        (function () { manager.setNwkParams('scan', 'xxx'); }).should.throw();
        (function () { manager.setNwkParams('scan', 123); }).should.throw();
        (function () { manager.setNwkParams('scan', true); }).should.throw();
        (function () { manager.setNwkParams('scan', undefined); }).should.throw();
        (function () { manager.setNwkParams('scan', null); }).should.throw();
    });
});

describe('Functional Check', function () {
    it('start()', function () {
        manager.start().should.deepEqual(manager);
    });

    it('setNwkParams() - scan', function (done) {
        manager.setNwkParams('scan', {interval: 10, window: 10}, function () {
            done();
        });
    });

    it('setNwkParams() - link', function (done) {
        manager.setNwkParams('link', {interval: 10, latency: 0, timeout: 100}, function (err) {
            if (err === null) { done(); }
        });
    });

    it('permitJoin()', function (done) {
        manager.permitJoin(100, function (err) {
            if (err === null) { done(); }
        });
    });

    this.timeout(3000);
    it('find()', function (done) {
        manager.on('IND', function (msg) {
            if (msg.type === 'DEV_INCOMING') {
                if (_.isObject(manager.find(msg.data))) {
                    done();
                }
            }
        });
    });
    this.timeout(2000);

    it('regGattDefs() - service', function () {
        manager.regGattDefs('service', [{name: 'test1', uuid: '0xfff0'}, {name: 'test2', uuid: '0xfff1'}]);
        GATTDEFS.ServUuid.get('test1').value.should.equal(0xfff0);
        GATTDEFS.ServUuid.get('test2').value.should.equal(0xfff1);
    });

    it('regGattDefs() - characteristic', function () {
        var info1 = {
                params: ['enable'], 
                types: ['uint8']
            },
            info2 = {
                params: ['rawT2', 'rawT1'], 
                types: ['uint16', 'uint16']
            };

        manager.regGattDefs('characteristic', [
            {name: 'KeyPressState', uuid: '0xffe1', params: ['enable'], types: ['uint8']}, 
            {name: 'Temp', uuid: '0xaa01', params: ['rawT2', 'rawT1'], types: ['uint16', 'uint16']} 
        ]);
        GATTDEFS.CharUuid.get('KeyPressState').value.should.equal(0xffe1);
        GATTDEFS.CharUuid.get('Temp').value.should.equal(0xaa01);
        hciCharMeta['0xffe1'].should.deepEqual(info1);
        hciCharMeta['0xaa01'].should.deepEqual(info2);
    });
});