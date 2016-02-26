var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('cc-bnp'),
    fs = require('fs'),
    GATTDEFS = require('../../lib/defs/gattdefs'),
    bShepherd = require('../../lib/cc254x/ble-shepherd'),
    devmgr = require('../../lib/cc254x/management/devmgr'),
    pubServInfo = require('../../lib/cc254x/service/example').publicServ,
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
        (function () { bShepherd.start(function () {}, {path: '123'}); }).should.not.throw();

        (function () { bShepherd.start(function () {}, {}); }).should.throw();
        (function () { bShepherd.start(function () {}, []); }).should.throw();
        (function () { bShepherd.start(function () {}, 'xxx'); }).should.throw();
        (function () { bShepherd.start(function () {}, 123); }).should.throw();
        (function () { bShepherd.start(function () {}, false); }).should.throw();
        (function () { bShepherd.start(function () {}, undefined); }).should.throw();
        (function () { bShepherd.start(function () {}, null); }).should.throw();
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

    var addServErrMsg = 'servInfo must be an object',
        charsInfoErrMsg = 'servInfo.charsInfo must be an array.',
        uuidErrMsg = 'servInfo.uuid must be a string and start with 0x';
    /*it('addLocalServ(servInfo) - bad servInfo Type(arr)', function () {
        return bShepherd.addLocalServ([]).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo Type(str)', function () {
        return bShepherd.addLocalServ('xxx').should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo Type(bool)', function () {
        return bShepherd.addLocalServ(true).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo Type(null)', function () {
        return bShepherd.addLocalServ(null).should.be.rejectedWith(addServErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.uuid Type(obj)', function () {
        return bShepherd.addLocalServ({uuid: {},charsInfo: []}).should.be.rejectedWith(uuidErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.uuid Type(arr)', function () {
        return bShepherd.addLocalServ({uuid: [],charsInfo: []}).should.be.rejectedWith(uuidErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.uuid Type(bool)', function () {
        return bShepherd.addLocalServ({uuid: true,charsInfo: []}).should.be.rejectedWith(uuidErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.uuid Type(str)', function () {
        return bShepherd.addLocalServ({uuid: 'xxx',charsInfo: []}).should.be.rejectedWith(uuidErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.uuid Type(obj)', function () {
        return bShepherd.addLocalServ({uuid: {},charsInfo: []}).should.be.rejectedWith(uuidErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.charsInfo Type(obj)', function () {
        return bShepherd.addLocalServ({uuid: '0x1800',charsInfo: {}}).should.be.rejectedWith(charsInfoErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.charsInfo Type(bool)', function () {
        return bShepherd.addLocalServ({uuid: '0x1800',charsInfo: false}).should.be.rejectedWith(charsInfoErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.charsInfo Type(str)', function () {
        return bShepherd.addLocalServ({uuid: '0x1800',charsInfo: 'xxx'}).should.be.rejectedWith(charsInfoErrMsg);
    });

    it('addLocalServ(servInfo) - bad servInfo.charsInfo Type(null)', function () {
        return bShepherd.addLocalServ({uuid: '0x1800',charsInfo: null}).should.be.rejectedWith(charsInfoErrMsg);
    });*/

    it('addLocalServ(servInfo)', function () {
        (function () { bShepherd.addLocalServ([]); }).should.throw();
        (function () { bShepherd.addLocalServ('xxx'); }).should.throw();
        (function () { bShepherd.addLocalServ(true); }).should.throw();
        (function () { bShepherd.addLocalServ(null); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: {},charsInfo: []}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: [],charsInfo: []}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: true,charsInfo: []}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: 'xxx',charsInfo: []}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: {},charsInfo: []}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: '0x1800',charsInfo: {}}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: '0x1800',charsInfo: false}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: '0x1800',charsInfo: 'xxx'}); }).should.throw();
        (function () { bShepherd.addLocalServ({uuid: '0x1800',charsInfo: null}); }).should.throw();
    });

    var setErrMsg = 'type must be a string of scan or link';
    /*it('setNwkParams(type, setting) - bad type(obj)', function () {
        return bShepherd.setNwkParams({} ,{}).should.be.rejectedWith(setErrMsg);
    });

    it('setNwkParams(type, setting) - bad type(arr)', function () {
        return bShepherd.setNwkParams([] ,{}).should.be.rejectedWith(setErrMsg);
    });

    it('setNwkParams(type, setting) - bad type(str)', function () {
        return bShepherd.setNwkParams('xxx' ,{}).should.be.rejectedWith(setErrMsg);
    });

    it('setNwkParams(type, setting) - bad type(num)', function () {
        return bShepherd.setNwkParams(123 ,{}).should.be.rejectedWith(setErrMsg);
    });

    it('setNwkParams(type, setting) - bad type(bool)', function () {
        return bShepherd.setNwkParams(true ,{}).should.be.rejectedWith(setErrMsg);
    });

    it('setNwkParams(type, setting) - bad type(null)', function () {
        return bShepherd.setNwkParams(null ,{}).should.be.rejectedWith(setErrMsg);
    });*/

    it('setNwkParams(type, setting)', function () {
        (function () { bShepherd.setNwkParams({} ,{}); }).should.throw();
        (function () { bShepherd.setNwkParams([] ,{}); }).should.throw();
        (function () { bShepherd.setNwkParams('xxx' ,{}); }).should.throw();
        (function () { bShepherd.setNwkParams(123 ,{}); }).should.throw();
        (function () { bShepherd.setNwkParams(true ,{}); }).should.throw();
        (function () { bShepherd.setNwkParams(null ,{}); }).should.throw();
    });
});

describe('Functional Check', function () {
    it('start()', function (done) {
        ccBnp.on('ready', function () {
            done();
        });
        bShepherd.start(function () {}, spConfig);
    });

    it('command()', function (done) {
        bShepherd.command('gap', 'setParam', {paramID: 2, paramValue: 10240}).then(function (result) {
            done();
        });
    });

    it('regGattDefs()', function () {
        var toRegServ = [{name: 'Test', uuid: '0xFFF0'}];

        bShepherd.regGattDefs('service', toRegServ).should.be.deepEqual(bShepherd);
        should(GATTDEFS.ServUuid.get(0xfff0)).be.type('object');
    });

    it('addLocalServ()', function (done) {
        bShepherd.addLocalServ(pubServInfo).then(function (serv) {
            if (serv._isRegister === true)
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
        devmgr.bleDevices.push(dev);
        bShepherd._regUuidHdlTable().should.be.deepEqual(result);
    });

    it('devmgr.stopScan()', function () {
        devmgr._stopScan().should.be.fulfilledWith();
    });
});