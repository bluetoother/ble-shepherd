// TODO, encryptAndReExec()
var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    fs = require('fs'),
    Char = require('../../lib/cc254x/management/characteristic'),
    GATTDEFS = require('../../lib/defs/gattdefs'),
    bledb = require('../../lib/cc254x/bledb');

var dbPath = '../../lib/cc254x/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var ownerServ = {ownerDev: {connHdl: 0}},
    charPubR = new Char({uuid: '0x2a00', hdl: 3, prop: ['Read']}),
    charPriW = new Char({uuid: '0xFFF3', hdl: 43, prop: ['Write']}),
    charPriNoti = new Char({uuid: '0xFFF4', hdl: 46, prop: ['Notif']}),
    charPriRW = new Char({uuid: '0xFFF1', hdl: 37, prop: ['Read', 'Write']});

charPubR.ownerServ = ownerServ;
charPriW.ownerServ = ownerServ;
charPriNoti.ownerServ = ownerServ;
charPriRW.ownerServ = ownerServ;

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
    var charInfo = {
        uuid: '0x2A00',
        hdl: 3,
        prop: 2
    },
    char = new Char(charInfo),
    name = GATTDEFS.CharUuid.get(_.parseInt(charInfo.uuid)).key;

    it('Char()', function () {
        should(char._id).be.null();
        should(char._isSync).be.false();
        should(char._authState).be.null();
        should(char.ownerServ).be.null();
        should(char.uuid).be.equal(charInfo.uuid);
        should(char.hdl).be.equal(charInfo.hdl);
        should(char.prop).be.equal(charInfo.prop);
        should(char.desc).be.null();
        should(char.name).be.equal(name);
        should(char.val).be.null();
    });
});

describe('Signature Check', function () {
    it('write(value) - no arg', function () {
        return charPubR.write().should.be.rejectedWith('value must be an object or a buffer');
    });

    it('write(value) - bad value(str)', function () {
        return charPubR.write('123').should.be.rejectedWith('value must be an object or a buffer');
    });

    it('write(value) - bad value(num)', function () {
        return charPubR.write(123).should.be.rejectedWith('value must be an object or a buffer');
    });

    it('write(value) - bad value(arr)', function () {
        return charPubR.write([]).should.be.rejectedWith('value must be an object or a buffer');
    });

    it('write(value) - bad value(bool)', function () {
        return charPubR.write(true).should.be.rejectedWith('value must be an object or a buffer');
    });

    it('encryptAndReExec(type, value) - no arg', function () {
        return charPubR._encryptAndReExec().should.be.rejectedWith('Bad arguments.');
    });

    it('encryptAndReExec(type, value) - bad type(num)', function () {
        return charPubR._encryptAndReExec(123).should.be.rejectedWith('type input error');
    });

    it('encryptAndReExec(type, value) - bad type(arr)', function () {
        return charPubR._encryptAndReExec([]).should.be.rejectedWith('type input error');
    });

    it('encryptAndReExec(type, value) - bad type(obj)', function () {
        return charPubR._encryptAndReExec({}).should.be.rejectedWith('type input error');
    });

    it('encryptAndReExec(type, value) - bad type(str)', function () {
        return charPubR._encryptAndReExec('123').should.be.rejectedWith('type input error');
    });

    it('setConfig(config) - string', function () {
        return charPubR.setConfig('123').should.be.rejectedWith('config must be a boolean');
    });

    it('setConfig(config) - number', function () {
        return charPubR.setConfig(123).should.be.rejectedWith('config must be a boolean');
    });

    it('setConfig(config) - array', function () {
        return charPubR.setConfig([]).should.be.rejectedWith('config must be a boolean');
    });

    it('setConfig(config) - object', function () {
        return charPubR.setConfig({}).should.be.rejectedWith('config must be a boolean');
    });
});

describe('Functional Check', function () {
    it('connect to device', function () {
        return ccBnp.gap.estLinkReq(0, 0, 0, '0x78c5e570796e').should.be.fulfilled();
    });

    it('read() - readable characteristic', function (done) {
        charPubR.read().then(function (result) {
            var resultVal = { name: 'Simple BLE Peripheral' };
            if (_.isEqual(charPubR.val, resultVal) && _.isEqual(result, resultVal))
                done();
        });
    });

    it('read() - writable characteristic', function () {
        return charPriW.read().should.be.rejectedWith('Characteristic value not allowed to read.');
    });

    it('write() - writable characteristic', function (done) {
        var val = new Buffer([1]);
        charPriW.write(val).then(function () {
            if (_.isEqual(charPriW.val, val))
                done();
        }).fail(function (err) {
            console.log(err);
        });
    });

    it('write() - readable characteristic', function () {
        return charPubR.write(new Buffer([1])).should.be.rejectedWith('Characteristic value not allowed to write.');
    });

    it('readDesc() - prop is read', function (done) {
        var resultVal = { userDescription: 'Characteristic 1' };
        charPubR.ownerServ.endHdl = 0xFFFF;
        charPubR.readDesc().then(function (result) {
            if (_.isEqual(result, resultVal) && _.isEqual(charPubR.desc, resultVal))
                done();
        });
    });

    it('readDesc() - prop is write', function (done) {
        var resultVal = { userDescription: 'Characteristic 3' };
        charPriW.ownerServ.endHdl = 0xFFFF;
        charPriW.readDesc().then(function (result) {
            if (_.isEqual(result, resultVal) && _.isEqual(charPriW.desc, resultVal))
                done();
        });
    });

    it('encryptAndReExec()', function () {
        // TODO
        // can't testing here
    });

    it('getConfig()', function (done) {
        charPriNoti.getConfig().then(function (result) {
            if (_.isBoolean(result))
                done();
        });
    });

    it('setConfig()', function (done) {
        charPriNoti.setConfig(false).then(function (result) {
            return charPriNoti.getConfig();
        }).then(function (result) {
            if (result === false)
                done();
        }).fail(function (err) {
            console.log(err);
        });
    });

    it('expInfo()', function () {
        var testChar = _.cloneDeep(charPubR);
        delete testChar._id;
        delete testChar._isSync;
        delete testChar._authState;
        delete testChar.ownerServ;
        delete testChar.name;
        delete testChar.processInd;
        testChar.owner = undefined;
        testChar.ancestor = undefined;
        charPubR.expInfo().should.deepEqual(testChar);
    });

    it('save()', function (done) {
        charPriRW.save().then(function (doc) {
            if (charPriRW._id === doc._id)
                done();
        });
    });

    it('indUpdate()', function (done) {
        var newVal = new Buffer([2]);
        charPriRW.indUpdate(newVal).then(function () {
            if (_.isEqual(charPriRW.val, newVal))
                done();
        });
    });

    it('update() - characteristic value unchange', function (done) {
        charPriRW.update().then(function () {
            if (charPriRW._isSync === true)
                done();
        });
    });

    it('update() - characteristic value change', function (done) {
        var newVal = new Buffer([3]);
        ccBnp.gatt.writeCharValue(0, charPriRW.hdl, newVal, charPriRW.uuid).then(function () {
            return charPriRW.update();
        }).then(function () {
            if (charPriRW._isSync)
                done();
        });

    });

    it('remove()', function () {
        charPriRW.remove().should.be.fulfilled();
    });


    it('disconnect to device', function () {
        return ccBnp.gap.terminateLink(0, 19).should.be.fulfilled();
    });
});