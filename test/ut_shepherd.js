var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    fs = require('fs'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    bShepherd = require('../lib/ble-shepherd'),
    pubServ = require('../lib/service/example').publicServ,
    spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

var dbPath = '../lib/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

describe('Signature Check', function () {
    it('start(spConfig)', function () {
        (function () { bShepherd.start({path: '123'}); }).should.not.throw();

        (function () { bShepherd.start({}); }).should.throw();
        (function () { bShepherd.start([]); }).should.throw();
        (function () { bShepherd.start('xxx'); }).should.throw();
        (function () { bShepherd.start(123); }).should.throw();
        (function () { bShepherd.start(false); }).should.throw();
        (function () { bShepherd.start(undefined); }).should.throw();
        (function () { bShepherd.start(null); }).should.throw();
    });

    it('regGattDefs(type, regObjs)', function () {
        (function () { bShepherd.regGattDefs('service', {}); }).should.not.throw();

        (function () { bShepherd.regGattDefs({}, {}); }).should.throw();
        (function () { bShepherd.regGattDefs([], {}); }).should.throw();
        (function () { bShepherd.regGattDefs('xxx', {}); }).should.throw();
        (function () { bShepherd.regGattDefs(123, {}); }).should.throw();
        (function () { bShepherd.regGattDefs(true, {}); }).should.throw();
        (function () { bShepherd.regGattDefs(undefined, {}); }).should.throw();
        (function () { bShepherd.regGattDefs(null, {}); }).should.throw();

        (function () { bShepherd.regGattDefs('service', 'xxx'); }).should.throw();
        (function () { bShepherd.regGattDefs('service', 123); }).should.throw();
        (function () { bShepherd.regGattDefs('service', true); }).should.throw();
        (function () { bShepherd.regGattDefs('service', undefined); }).should.throw();
        (function () { bShepherd.regGattDefs('service', null); }).should.throw();
    });

    var addServErrMsg = 'Service object must instance of bleServConstr module.';
    it('addLocalServ(bleServ) - bad bleServ Type(obj)', function () {
        return bShepherd.addLocalServ({}).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(bleServ) - bad bleServ Type(arr)', function () {
        return bShepherd.addLocalServ([]).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(bleServ) - bad bleServ Type(str)', function () {
        return bShepherd.addLocalServ('xxx').should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(bleServ) - bad bleServ Type(bool)', function () {
        return bShepherd.addLocalServ(true).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(bleServ) - bad bleServ Type(null)', function () {
        return bShepherd.addLocalServ(null).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(bleServ) - no central', function () {
        return bShepherd.addLocalServ(pubServ).should.be.rejectedWith('You must connect to the local side host.');
    });

    it('addLocalServ(bleServ) - service already exist', function () {
        bShepherd.bleCentral = {servs: [pubServ]};
        return bShepherd.addLocalServ(pubServ).should.be.rejectedWith('Local service already exist. You need to delete the old before add a new.');
    });
});

describe('Functional Check', function () {
    it('start()', function (done) {
        ccBnp.on('ready', function () {
            done();
        });
        bShepherd.start(spConfig);
    });

    it('callBleCmd()', function (done) {
        bShepherd.callBleCmd('gap', 'setParam', {paramID: 2, paramValue: 10240}).then(function (result) {
            done();
        });
    });

    it('regGattDefs()', function () {
        var toRegServ = [{name: 'Test', uuid: '0xFFF0'}];

        bShepherd.regGattDefs('service', toRegServ).should.be.deepEqual({name: [], uuid: []});
        should(GATTDEFS.ServUuid.get(0xfff0)).be.type('object');
    });

    it('addLocalServ()', function (done) {
        bShepherd.addLocalServ(pubServ).then(function () {
            if (pubServ._isRegister === true)
                done();
        });
    });

    it('_regUuidHdlTable()', function () {
            var dev = {
                role: 'peripheral',
                connHdl: 1,
                servs: {
                    serv: {
                        chars: [  
                            {hdl: 1, uuid: '0x0011'}, 
                            {hdl: 2, uuid: '0x0022'}, 
                            {hdl: 3, uuid: '0x0033'}
                        ]
                    }
                }
            },
            result = {
                1: {
                    1: '0x0011',
                    2: '0x0022',
                    3: '0x0033'
                }
            };
        should(bShepherd._regUuidHdlTable()).be.undefined();
        bShepherd.devmgr.bleDevices.push(dev);
        bShepherd._regUuidHdlTable().should.be.deepEqual(result);
    });

    it('devmgr.stopScan()', function () {
        bShepherd.devmgr.stopScan().should.be.fulfilledWith();
    });
});