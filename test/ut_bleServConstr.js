var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    BleServ = require('../lib/service/bleServConstr'),
    GATTDEFS = require('../lib/defs/gattdefs');

var pubCharsInfo = [
        {uuid: '0x2a00', permit: ['Read'], prop: ['Read'], val: {DeviceName:"Simple BLE Central"}},
        {uuid: '0x2a01', permit: ['Read'], prop: ['Read'], val: {Appearance:0}},
        {uuid: '0x2a02', permit: ['Read', 'Write'], prop: ['Read', 'Write'], val: {PeripheralPrivacyFlag: 0}},
        {uuid: '0x2a04', permit: ['Read'], prop: ['Read'], val: {MinConnInterval:80, MaxConnInterval:160, Latency:0, Timeout:1000}},
    ],
    priCharsInfo = [
        {uuid: '0xfff1', permit: ['Read'], prop: ['Read'], desc: 'CHAR1', name: 'CHAR1', val: {val: 20}},
        {uuid: '0xfff2', permit: ['Read'], prop: ['Read'], desc: 'CHAR2', name: 'CHAR2', val: 40},
        {uuid: '0xfff3', permit: ['Read', 'Write'], prop: ['Read', 'Write'], desc: 'CHAR3', name: 'CHAR3', val: 60},
        {uuid: '0xfff4', permit: ['Read'], prop: ['Read'], name: 'CHAR4', val: 80},
        {uuid: '0xfff5', permit: ['Read'], prop: ['Read'], name: 'CHAR5', val: 100},
    ],
    pubServ = new BleServ('0x1800', pubCharsInfo),
    priServ = new BleServ('0xfff0', priCharsInfo, 'centralServ');

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
    var char = pubServ.chars['0x2a00'];

    it('BleServ()', function () {
        should(pubServ._isRegister).be.false();
        should(pubServ.uuid).be.equal('0x1800');
        should(pubServ.startHdl).be.null();
        should(pubServ.endHdl).be.null();
        should(pubServ.name).be.equal(GATTDEFS.ServUuid.get(0x1800).key);
    });

    it('BleChar()', function () {
        var uuid = _.parseInt(pubCharsInfo[0].uuid);
        should(char.name).be.equal(GATTDEFS.CharUuid.get(uuid).key);
        should(char.uuid).be.equal(pubCharsInfo[0].uuid);
        should(char.info).be.deepEqual(pubCharsInfo[0]);
    });
});

describe('Signature Check', function () {
    it('_addChars(charsInfo)', function () {
        (function () { pubServ._addChars([]); }).should.not.throw();

        (function () { pubServ._addChars(); }).should.throw();
        (function () { pubServ._addChars('xxx'); }).should.throw();
        (function () { pubServ._addChars(123); }).should.throw();
        (function () { pubServ._addChars({}); }).should.throw();
        (function () { pubServ._addChars(false); }).should.throw();
        (function () { pubServ._addChars(undefined); }).should.throw();
        (function () { pubServ._addChars(null); }).should.throw();
    });

    it('findChar(hdl)', function () {
        (function () { pubServ.findChar(123); }).should.not.throw();

        (function () { pubServ.findChar(); }).should.throw();
        (function () { pubServ.findChar({}); }).should.throw();
        (function () { pubServ.findChar([]); }).should.throw();
        (function () { pubServ.findChar('xxx'); }).should.throw();
        (function () { pubServ.findChar(false); }).should.throw();
        (function () { pubServ.findChar(undefined); }).should.throw();
        (function () { pubServ.findChar(null); }).should.throw();
    });

    it('_addAttrs(charInfo)', function () {
        (function () { pubServ.chars['0x2a00']._addAttrs({}); }).should.not.throw();

        (function () { pubServ.chars['0x2a00']._addAttrs(); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs([]); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs('xxx'); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs(123); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs(false); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs(undefined); }).should.throw();
        (function () { pubServ.chars['0x2a00']._addAttrs(null); }).should.throw();
    });
});

describe('Functional Check', function () {
    it('_addChars()', function () {
        var charsObj = {},
            newCharsObj = {};
        _.forEach(pubCharsInfo, function (char) {
            charsObj[char.uuid] = {
                name: GATTDEFS.CharUuid.get(_.parseInt(char.uuid)).key,
                uuid: char.uuid,
                info: char,
                onMessage: function (uuid, data) {},
                onIndMessage: function (type) {}
            };
        });

        pubServ.chars = {};
        pubServ._addChars(pubCharsInfo);
        newCharsObj = _.cloneDeep(pubServ.chars);
        _.forEach(newCharsObj, function (char) {
            delete char.attrs;
        });
        should(newCharsObj).be.deepEqual(charsObj);
    });

    it('_assignHdls()', function () {
        var flag = true,
            count = 0;

        pubServ.startHdl = 0;
        pubServ.endHdl = 8;
        pubServ._assignHdls();
        _.forEach(pubServ.chars, function (char) {
            _.forEach(char.attrs, function (attr) {
                count += 1;
                if (attr.hdl !== count)
                    flag = false;
            });
        });
        should(flag).be.true();
    });

    it('expUuidHdlTable()', function () {
        pubServ._isRegister = true;
        should(pubServ.expUuidHdlTable()).be.type('object');
    });

    it('findChar()', function () {
        should(pubServ.findChar(100)).be.undefined();
        pubServ.findChar(1).should.deepEqual(pubServ.chars['0x2a00']);
    });

    it('getAttrs()', function () {
        var attrs = [],
            count = 1,
            count2;
        _.forEach(pubCharsInfo, function (charInfo) {
            count2 = count;
            count2 += 1;
            attrs.push({
                uuid: '0x2803',
                permit: ['Read'],
                hdl: count,
                val: {
                    uuid: charInfo.uuid,
                    prop: charInfo.prop,
                    hdl: count2
                }
            });
            count += 1;
            attrs.push({
                uuid: charInfo.uuid,
                permit: charInfo.permit,
                hdl: count,
                val: charInfo.val
            });
            count += 1;
        });
        pubServ.getAttrs().should.deepEqual(attrs);
    });
});