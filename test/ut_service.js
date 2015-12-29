var _ = require('lodash'),
    should = require('should'),
    shouldd = require('should-promised'),
    ccBnp = require('ccbnp'),
    fs = require('fs'),
    Serv = require('../lib/management/service'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    bledb = require('../lib/bledb');

var dbPath = '../lib/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var ownerDev = {connHdl: 0, _id: '78c5e570796e', servs: []},
    pubServ = new Serv({uuid: '0x1800', startHdl: 1, endHdl: 11}),
    priServ = new Serv({uuid: '0xfff0', startHdl: 35, endHdl: 65535});

pubServ.ownerDev = ownerDev;
priServ.ownerDev = ownerDev;

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
    var servInfo = {
            uuid: '0x1800',
            startHdl: 10,
            endHdl: 50
        },
        serv = new Serv(servInfo),
        name = GATTDEFS.ServUuid.get(_.parseInt(servInfo.uuid)).key;

    it('Serv()', function () {
        should(serv._id).be.null();
        should(serv._isSync).be.false();
        should(serv.ownerDev).be.null();
        should(serv.uuid).be.equal(servInfo.uuid);
        should(serv.startHdl).be.equal(servInfo.startHdl);
        should(serv.endHdl).be.equal(servInfo.endHdl);
        should(serv.name).be.equal(name);
        should(serv.chars).be.deepEqual({});
    });
});

describe('Signature Check', function () {
    //none
});

describe('Functional Check', function () {
    it('connect to device', function () {
        return ccBnp.gap.estLinkReq(0, 0, 0, '0x78c5e570796e').should.be.fulfilled();
    });

    it('getChars() - public service', function (done) {
        pubServ._getChars().then(function () {
            var charArr = ['0x2a00', '0x2a01', '0x2a02', '0x2a03', '0x2a04'];
            _.forEach(pubServ.chars, function (char, key) {
                charArr.splice(_.indexOf(charArr, key), 1);
            });
            if (_.size(charArr) === 0)
                done();
        });
    });

    it('getChars() - private service', function (done) {
        priServ._getChars().then(function () {
            var charArr = ['0xfff1', '0xfff2', '0xfff3', '0xfff4', '0xfff5'];
            _.forEach(priServ.chars, function (char, key) {
                charArr.splice(_.indexOf(charArr, key), 1);
            });
            if (_.size(charArr) === 0)
                done();
        });
    });

    it('expInfo()', function () {
        var serv = _.cloneDeep(pubServ),
            chars = [];
        delete serv._id;
        delete serv._isSync;
        delete serv.ownerDev;
        delete serv.name;
        _.forEach(serv.chars, function (char) {
            chars.push(char.uuid);
        });
        serv.chars = chars;
        serv.owner = '78c5e570796e';
        pubServ.expInfo().should.deepEqual(serv);
    });

    it('save()', function () {
        return pubServ.save().should.be.fulfilled();
    });

    it('update()', function () {
        return pubServ.update().should.be.fulfilled();
    });

    it('loadChars()', function (done) {
        var chars = {};

        _.forEach(pubServ.chars, function (char, key) {
            chars[key] = char.expInfo();
        });
        pubServ.chars = {};
        pubServ._loadChars().then(function () {
            _.forEach(pubServ.chars, function (char, key) {
                pubServ.chars[key] = char.expInfo();
            });
            if (_.isEqual(pubServ.chars, chars))
                done();
        });
    });

    it('remove()', function () {
        return pubServ.remove().should.be.fulfilled();
    });

    it('disconnect to device', function () {
        return ccBnp.gap.terminateLink(0, 19).should.be.fulfilled();
    });
});
