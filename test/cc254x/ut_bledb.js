var _ = require('lodash'),
    should = require('should-promised'),
    fs = require('fs'),
    bledb = require('../../lib/cc254x/bledb');

var dbPath = '../../lib/cc254x/database/ble.db';
fs.exists(dbPath, function (isThere) {
    if (isThere) { fs.unlink(dbPath); }
});

var testDev1 = {
        _id: '78c5e570796e',
        role: 'peripheral',
        addr: '0x78c5e570796e',
        addrType: 0,
        linkParams: {"interval":80,"latency":0,"timeout":2000},
        servs: ["0x1800","0x1801","0x180a","0xfff0"],
        sm: null
    },
    testDev2 = {
        _id: '544a165e1f53',
        role: 'peripheral',
        addr: '0x544a165e1f53',
        addrType: 0,
        linkParams: {"interval":80,"latency":0,"timeout":2000},
        servs: ["0x1800","0x1801","0x180a","0x1803","0x1802","0x1804","0x180f","0xffa0","0xffe0"],
        sm: null
    };

var testServ1 = {
        owner: '78c5e570796e',
        uuid: '0x1800',
        startHdl: 1,
        endHdl: 5,
        chars: ["0x2a00","0x2a01","0x2a02","0x2a03","0x2a04"]
    },
    testServ2 = {
        owner: '544a165e1f53',
        uuid: '0xfff0',
        startHdl: 6,
        endHdl: 10,
        chars: ["0xfff1","0xfff2","0xfff3","0xfff4","0xfff5"]
    };

var testChar1 = {
        owner: '78c5e570796e',
        ancestor: '78c5e570796e',
        uuid: '0x2a00',
        hdl: 2,
        prop: 2,
        val: {DeviceName:"Simple BLE Peripheral"},
        desc: null
    },
    testChar2 = {
        owner: '544a165e1f53',
        ancestor: '544a165e1f53',
        uuid: '0xfff1',
        hdl: 7,
        prop: 10,
        val: {val:1},
        desc: null
    };

describe('saveInfo check: ', function() {
    it('save testDev1', function () {
        return bledb.saveInfo('device', testDev1).should.be.fulfilledWith(testDev1);
    });
    it('save testDev2', function () {
        return bledb.saveInfo('device', testDev2).should.be.fulfilledWith(testDev2);
    });
    it('save testDev1 again', function () {
        return bledb.saveInfo('device', testDev1).should.be.fulfilledWith(testDev1);
    });
    it('save testDev2 again', function () {
        return bledb.saveInfo('device', testDev2).should.be.fulfilledWith(testDev2);
    });


    it('save testServ1', function (done) {
        bledb.saveInfo('service', testServ1).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ1)) { done(); }
        });
    });
    it('save testServ2', function (done) {
        return bledb.saveInfo('service', testServ2).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ2)) { done(); }
        });
    });
    it('save testServ1 again', function (done) {
        return bledb.saveInfo('service', testServ1).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ1)) { done(); }
        });
    });
    it('save testServ2 again', function (done) {
        return bledb.saveInfo('service', testServ2).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ2)) { done(); }
        });
    });


    it('save testChar1', function (done) {
        return bledb.saveInfo('characteristic', testChar1).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar1)) { done(); }
        });
    });
    it('save testChar2', function (done) {
        return bledb.saveInfo('characteristic', testChar2).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar2)) { done(); }
        });
    });
    it('save testChar1 again', function (done) {
        return bledb.saveInfo('characteristic', testChar1).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar1)) { done(); }
        });
    });
    it('save testChar2 again', function (done) {
        return bledb.saveInfo('characteristic', testChar2).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar2)) { done(); }
        });
    });
});

describe('getInfo check: ', function () {
    it('get device info', function () {
        var comparedDevArr = _.sortBy([testDev1, testDev2], '_id');
        return bledb.getInfo('device').should.be.fulfilledWith(comparedDevArr);
    });

    it('get service info', function (done) {
        var comparedServArr = _.sortBy([testServ1, testServ2], '_id');
        bledb.getInfo('service').then(function (result) {
            _.forEach(result, function (serv) {
                delete serv._id;
            });
            if (_.isEqual(comparedServArr, result)) { done(); }
        });
    });

    it('get characteristic info', function (done) {
        var comparedCharArr = _.sortBy([testChar1, testChar2], '_id');
        bledb.getInfo('characteristic').then(function (result) {
            _.forEach(result, function (char) {
                delete char._id;
            });
            if (_.isEqual(comparedCharArr, result)) { done(); }
        });
    });
});

describe('update check: ', function () {
    it('error testing', function () {
        return bledb.update('0123456').should.be.rejectedWith('No such object 0123456 for property update.');
    });

    it('update device info', function () {
        return bledb.update('78c5e570796e', testDev1).should.be.fulfilledWith(0);
    });

    it('update device info', function () {
        return bledb.update('78c5e570796e', {linkParams: {"interval":90,"latency":0,"timeout":2000}}).should.be.fulfilledWith(1);
    });

    it('update device info', function () {
        return bledb.update('78c5e570796e', {linkParams: {"interval":80,"latency":0,"timeout":2000}, servs: ['0x1800']}).should.be.fulfilledWith(1);
    });

    it('update device info', function () {
        return bledb.update('78c5e570796e', {servs: ['0x1800', '0x1801', '0x180a', '0xfff0']}).should.be.fulfilledWith(1);
    });
});

describe('hasInDB check: ', function () {
    it ('error testing', function () {
        return bledb.hasInDB({_id: '0123456'}).should.be.fulfilledWith(null);
    });

    it('testDev1', function () {
        return bledb.hasInDB({_id: '78c5e570796e'}).should.be.fulfilledWith(testDev1);
    });
    it('testDev2', function () {
        return bledb.hasInDB({_id: '544a165e1f53'}).should.be.fulfilledWith(testDev2);
    });

    it('testServ1',function (done) {
        return bledb.hasInDB({owner: '78c5e570796e', uuid: '0x1800'}).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ1)) { done(); }
        });
    });
    it('testServ2',function (done) {
        return bledb.hasInDB({owner: '544a165e1f53', uuid: '0xfff0'}).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testServ2)) { done(); }
        });
    });

    it('testChar1', function (done) {
        return bledb.hasInDB({owner: '78c5e570796e', uuid: '0x2a00'}).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar1)) { done(); }
        });
    });
    it('testChar2', function (done) {
        return bledb.hasInDB({owner: '544a165e1f53', uuid: '0xfff1'}).then(function (result) {
            delete result._id;
            if (_.isEqual(result, testChar2)) { done(); }
        });
    });
});

describe('remove check: ', function () {
    var charsInfo,
        servsInfo;

    it('get chars info', function (done) {
        bledb.getInfo('characteristic').then(function (result) {
            charsInfo = result;
            done();
        }); 
    });
    it('get chars info', function (done) {
        bledb.getInfo('service').then(function (result) {
            servsInfo = result;
            done();
        }); 
    });

    it('remove char1', function () {
        return bledb.remove('characteristic', charsInfo[0]._id).should.be.fulfilled();
    });
    it('remove char2', function () {
        return bledb.remove('characteristic', charsInfo[1]._id).should.be.fulfilled();
    });
    it('check remove characteristic result', function () {
        return bledb.getInfo('characteristic').should.be.fulfilledWith([]);
    });


    it('insert characteristic', function (done) {
        testChar1.owner = servsInfo[0]._id;
        testChar2.owner = servsInfo[1]._id;

        bledb.saveInfo('characteristic', testChar1).then(function (result) {
            return bledb.saveInfo('characteristic', testChar2);
        }).then(function (result) {
            done();
        }).fail(function (err) {
            console.log(err);
        });
    });
    it('remove serv1', function () {
        return bledb.remove('service', servsInfo[0]._id).should.be.fulfilled();
    });
    it('remove serv2', function () {
        return bledb.remove('service', servsInfo[1]._id).should.be.fulfilled();
    });
    it('check remove service result', function (done) {
        var result1;
        bledb.getInfo('service').then(function (result) {
            result1 = result;
            return bledb.getInfo('characteristic');
        }).then(function (result2) {
            if (_.isEqual(result1, []) && _.isEqual(result2, [])) { done(); }
        });
    });


    it('insert service and characteristic', function (done) {
        testChar1.owner = servsInfo[0]._id;
        testChar2.owner = servsInfo[1]._id;

        bledb.saveInfo('service', testServ1).then(function (result) {
            return bledb.saveInfo('service', testServ2);
        }).then(function (result) {
            return bledb.saveInfo('characteristic', testChar1);
        }).then(function (result) {
            return bledb.saveInfo('characteristic', testChar2);
        }).then(function (result) {
            done();
        });
    });
    it('remove dev1', function () {
        return bledb.remove('device', '78c5e570796e').should.be.fulfilled();
    });
    it('remove dev2', function () {
        return bledb.remove('device', '544a165e1f53').should.be.fulfilled();
    });
    it('check remove device result', function () {
        var result1,
            result2;
        bledb.getInfo('device').then(function (result) {
            result1 = result;
            return bledb.getInfo('service');
        }).then(function (result) {
            result2 = result;
            return bledb.getInfo('characteristic');
        }).then(function (result3) {
            if (_.isEqual(result1, []) && _.isEqual(result2, []) && _.isEqual(result3, [])) { done(); }
        });
    });
});