var _ = require('busyman'),
    fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect,
    ccbnp = require('cc-bnp');

chai.use(sinonChai);

var BShepherd = require('../index'),
    Periph = require('../lib/model/peripheral'),
    Serv = require('../lib/model/service'),
    GATTDEFS = require('../lib/defs/gattdefs'),
    GAPDEFS = require('../lib/defs/gapdefs');

try {
    fs.unlinkSync(path.resolve(__dirname + '/../lib/database/ble.db'));
} catch (e) {
    console.log(e);
}

var central = new BShepherd('cc-bnp', 'xxx'),
    controller = central._controller;

    // central._periphBox._db._db.loadDatabase();

describe('Signature Check', function() {
    var peripheral = new Periph({ addr: '0x123456789012', addrType: 0 });
        
    peripheral._controller = controller;

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

    it('peripheral.encrypt(setting[, callback])', function () {
        expect(function () { peripheral.encrypt({}); }).to.not.throw();
        expect(function () { peripheral.encrypt(); }).to.not.throw();

        expect(function () { peripheral.encrypt([]); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt('xxx'); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt(123); }).to.throw('setting must be an object');
        expect(function () { peripheral.encrypt(true); }).to.throw('setting must be an object');
    });

    it('passPasskey(passkey[, callback])', function () {
        expect(function () { peripheral.passPasskey('000000'); }).to.not.throw();

        expect(function () { peripheral.passPasskey({}); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey([]); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey(123); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey('xxx'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey('123'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey('abcdef'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey(undefined); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.passPasskey(null); }).to.throw('Passkey must be a string of length 6.');

    });

    it('peripheral.findChar(uuidServ, uuidChar)', function () {
        peripheral.servs['0x1800'] = {};

        expect(function () { peripheral.findChar('0x1800', '0x2a00'); }).to.not.throw();

        expect(function () { peripheral.findChar({}, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar([], '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(123, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar('xxx', '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(true, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(undefined, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');
        expect(function () { peripheral.findChar(null, '0x2a00'); }).to.throw('uuidServ must be a string and start with 0x');

        expect(function () { peripheral.findChar('0x1800', {}); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', []); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', 'xxx'); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', undefined); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', true); }).to.throw('uuidChar must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', null); }).to.throw('uuidChar must be a number or a string start with 0x');
    });

    it('peripheral.regCharHdlr(uuidServ, uuidChar, fn)', function () {
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

describe('Functional Check', function () {
    var peripheral = new Periph({ addr: '0x123456789012', addrType: 0 }),
        servInfo = {
            uuid: '0x1800',
            startHdl: 1,
            endHdl: 20,
            chars: [ 
                {
                    uuid: '0x2a00',
                    hdl: 2,
                    prop: ['read']
                }
            ]
        };

    var generalFunc = function () {
        var deferred = Q.defer();

        deferred.resolve();
        return deferred.promise;
    };

    peripheral._controller = controller;
    peripheral.servs['0x1800'] = new Serv(servInfo, peripheral);


    describe('#.connect', function () {
        // it('should connect ok', function (done) {
        //     var connectStub = sinon.stub(controller, 'connect', function () {
        //         var deferred = Q.defer();

        //         deferred.resolve({collector: {GapLinkEstablished: [{addr: peripheral.addr}]}});
        //         return deferred.promise;
        //     });

        //     peripheral.connect(function (err) {
        //         if (err)
        //             console.log(err);
        //         else {
        //             connectStub.restore();
        //             expect(connectStub).to.have.been.calledOnce;
        //             expect(connectStub).to.have.been.calledWith(peripheral);
        //             done();
        //         }
        //     });
        // });

        it('should do nothing if connHdl not equal to null or undefined', function (done) {
            var connectStub = sinon.stub(controller, 'connect', generalFunc);

            peripheral.connHdl = 0;

            peripheral.connect(function (err) {
                if (err)
                    console.log(err);
                else {
                    connectStub.restore();
                    expect(connectStub).to.have.been.callCount(0);
                    expect(peripheral.status).to.be.equal('online');
                    done();
                }
            });
        });
    });

    describe('#.disconnect', function () {
        it('should disconnect ok', function () {
            var disconnectStub = sinon.stub(controller, 'disconnect', generalFunc);

            peripheral.disconnect(function (err) {
                if (err)
                    console.log(err);
                else {
                    disconnectStub.restore();
                    expect(disconnectStub).to.have.been.calledOnce;
                    expect(disconnectStub).to.have.been.calledWith(peripheral);
                    done();
                }
            });
        });

        it('should do nothing if connHdl equal to null or undefined', function (done) {
            var disconnectStub = sinon.stub(controller, 'disconnect', generalFunc);

            peripheral.connHdl = null;

            peripheral.disconnect(function (err) {
                if (err)
                    console.log(err);
                else {
                    disconnectStub.restore();
                    expect(disconnectStub).to.have.been.callCount(0);
                    expect(peripheral.status).to.be.equal('offline');
                    done();
                }
            });
        });
    });

    // describe('#.remove', function () {
    //     it('should disconnect to peripheral and remove from objectbox', function (done) {
    //         var disconnectStub = sinon.stub(controller, 'disconnect', generalFunc);

    //         peripheral.connHdl = 0;
    //         peripheral._id = 1;

    //         central.regPeriph(peripheral, function () {
    //             expect(central.find(peripheral.addr)).to.be.deep.equal(peripheral);

    //             peripheral.remove(function (err) {
    //                 if(err)
    //                     console.log(err);
    //                 else {
    //                     disconnectStub.restore();
    //                     expect(disconnectStub).to.have.been.calledOnce;
    //                     expect(disconnectStub).to.have.been.calledWith(peripheral);
    //                     expect(central.find(peripheral.addr)).to.be.undefined;
    //                     done();
    //                 }
    //             });
    //         });

    //     });
    // });

    describe('#.update', function () {
        var servInfo1 = {
                uuid: '0x1800',
                startHdl: 1,
                endHdl: 20,
                chars: [ 
                    {
                        uuid: '0x2a00',
                        hdl: 2,
                        prop: ['write']
                    }
                ]
            },
            servInfo2 = {
                uuid: '0xbb00',
                startHdl: 21,
                endHdl: 25,
                chars: [ 
                    {
                        uuid: '0xcc00',
                        hdl: 22,
                        prop: ['read']
                    },
                    {
                        uuid: '0xcc01',
                        hdl: 24,
                        prop: ['read']
                    }
                ]
            };

        peripheral.servs['0x1800'] = new Serv(servInfo1, peripheral);
        peripheral.servs['0xbb00'] = new Serv(servInfo2, peripheral);

        it('should read characteristic value of service 0xcc00', function (done) {
            var readStub = sinon.stub(controller, 'read', function () {
                    var deferred = Q.defer();

                    deferred.resolve({ value: 10 });
                    return deferred.promise;
                }),
                charChangedHdlr,
                evtCount = 0;

            charChangedHdlr = function (msg) {
                var charInfo =  { 
                        periphId: peripheral.addr,
                        type: 'val',
                        servUuid: '0xbb00',
                        charUuid: null,
                        value: { value: 10 }
                    };

                charInfo.charUuid = '0xcc00';
                if (_.isEqual(charInfo, msg)) evtCount += 1;
                charInfo.charUuid = '0xcc01';
                if (_.isEqual(charInfo, msg)) evtCount += 1;

                if (evtCount === 2) controller.removeListener('charChanged', charChangedHdlr);
            };

            peripheral.status = 'online';
            central.regPeriph(peripheral);
            controller.on('charChanged', charChangedHdlr);
            peripheral.update(function (err) {
                var char1 = peripheral.servs['0xbb00'].chars['22'],
                    char2 = peripheral.servs['0xbb00'].chars['24'];

                if (err)
                    console.log(err);
                else {
                    readStub.restore();
                    expect(readStub).to.have.been.calledTwice;
                    expect(readStub).to.have.been.calledWith(char1);
                    expect(readStub).to.have.been.calledWith(char2);
                    expect(char1.val).to.be.deep.equal({ value: 10 });
                    expect(char2.val).to.be.deep.equal({ value: 10 });
                    expect(evtCount).to.be.equal(2);
                    done();
                }
            });
        });
    });

    describe('#.updateLinkParam', function () {
        it('should update success and change linkParams property to new setting', function (done) {
            var updateLinkParamStub = sinon.stub(controller, 'updateLinkParam', generalFunc),
                setting = {
                    interval: 0x0010,
                    latency: 0x0000,
                    timeout: 0x0190
                };

            peripheral.status = 'online';
            peripheral.updateLinkParam(setting.interval, setting.latency, setting.timeout, function (err) {
                if (err)
                    console.log(err);
                else {
                    updateLinkParamStub.restore();
                    expect(updateLinkParamStub).to.have.been.calledOnce;
                    expect(updateLinkParamStub).to.have.been.calledWith(peripheral, setting);
                    expect(peripheral.linkParams).to.be.deep.equal(setting);
                    done();
                }
            });
        });

        it('should return error if peripheral is not online', function (done) {
            var updateLinkParamStub = sinon.stub(controller, 'updateLinkParam', generalFunc);

            peripheral.status = 'offline';
            peripheral.updateLinkParam(0, 0, 0, function (err) {
                expect(err.message).to.be.equal('Device is not online.');
                done();
            });
        });
    });

    describe('#.encrypt', function () {
        it('should encrypt success with bonding and create security model', function (done) {
            var setBondParamStub = sinon.stub(controller, 'setBondParam', generalFunc),
                bondStub = sinon.stub(controller, 'bond', generalFunc),
                authenticateStub = sinon.stub(controller, 'authenticate', function () {
                    var deferred = Q.defer(),
                        result = {
                            status: 0,
                            dev_ltk: 'ltk',
                            dev_div: 'div',
                            dev_rand: 'rand'
                        };
                    deferred.resolve(result);
                    return deferred.promise;
                });
                
            var setting = {
                    pairMode: 0x01,
                    ioCap: 0x00,
                    mitm: true,
                    bond: true
                };

            peripheral.encrypt(setting, function (err) {
                if (err)
                    console.log(err);
                else {
                    setBondParamStub.restore();
                    bondStub.restore();
                    authenticateStub.restore();
                    expect(setBondParamStub).to.have.callCount(4);
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.PairingMode.value, new Buffer([1]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.MitmProtection.value, new Buffer([1]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.IoCap.value, new Buffer([0]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.BondingEnabled.value, new Buffer([1]));
                    expect(authenticateStub).to.have.been.calledOnce;
                    expect(authenticateStub).to.have.been.calledWith(peripheral, 0, true, true);
                    expect(bondStub).to.have.been.calledOnce;
                    expect(bondStub).to.have.been.calledWith(peripheral, 1, { ltk: 'ltk', div: 'div', rand: 'rand' });
                    done();
                }
            });
        });
        it('should encrypt success without bonding and create security model', function (done) {
            var setBondParamStub = sinon.stub(controller, 'setBondParam', generalFunc),
                bondStub = sinon.stub(controller, 'bond', generalFunc),
                authenticateStub = sinon.stub(controller, 'authenticate', function () {
                    var deferred = Q.defer(),
                        result = {
                            status: 0,
                            dev_ltk: 'ltk',
                            dev_div: 'div',
                            dev_rand: 'rand'
                        };
                    deferred.resolve(result);
                    return deferred.promise;
                });
                
            var setting = {
                    pairMode: 0x01,
                    ioCap: 0x00,
                    mitm: true,
                    bond: false
                };

            peripheral.encrypt(setting, function (err) {
                if (err)
                    console.log(err);
                else {
                    setBondParamStub.restore();
                    bondStub.restore();
                    authenticateStub.restore();
                    expect(setBondParamStub).to.have.callCount(4);
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.PairingMode.value, new Buffer([1]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.MitmProtection.value, new Buffer([1]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.IoCap.value, new Buffer([0]));
                    expect(setBondParamStub).to.have.been.calledWith(GAPDEFS.BondParam.BondingEnabled.value, new Buffer([0]));
                    expect(authenticateStub).to.have.been.calledOnce;
                    expect(authenticateStub).to.have.been.calledWith(peripheral, 0, true, false);
                    expect(bondStub).to.have.callCount(0);
                    done();
                }
            });
        });
    });

    describe('#.passPasskey', function () {
        it('should pass success', function (done) {
            var passStub = sinon.stub(controller, 'passkeyUpdate', generalFunc),
                passkey = '123456';

            peripheral.passPasskey(passkey, function (err) {
                if (err)
                    console.log(err);
                else {
                    passStub.restore();
                    expect(passStub).to.have.been.calledOnce;
                    expect(passStub).to.have.been.calledWith(peripheral, passkey);
                    done();
                }
            });
        });
    });

    describe('#.findChar', function () {
        it('should find characteristic', function () {
            expect(peripheral.findChar('0xbb00', '0xcc05')).to.be.undefined;
            expect(peripheral.findChar('0xbb00', '0xcc00')).to.be.deep.equal(peripheral.servs['0xbb00'].chars['22']);
            expect(peripheral.findChar('0xbb00', 22)).to.be.deep.equal(peripheral.servs['0xbb00'].chars['22']);
        });
    });

    describe('#.readDesc', function () {
        it('should read ok, desc property of char equal to result, emit charChanged event if result not equal to old one', function (done) {
            var desc = 'description',
                charChangedHdlr,
                evtFlag = false,
                readDescStub = sinon.stub(controller, 'readDesc', function () {
                    var deferred = Q.defer();
                    deferred.resolve(desc);
                    return deferred.promise;
                });

            charChangedHdlr = function (msg) {
                var charInfo =  { 
                        periphId: peripheral.addr,
                        type: 'desc',
                        servUuid: '0xbb00',
                        charUuid: '0xcc00',
                        value: desc
                    };

                if (_.isEqual(charInfo, msg)) {
                    evtFlag = true;
                    controller.removeListener('charChanged', charChangedHdlr);
                }
            };

            peripheral.status = 'online';
            controller.on('charChanged', charChangedHdlr);
            peripheral.readDesc('0xbb00', '0xcc00', function (err, result) {
                if (err)
                    console.log(err);
                else {
                    readDescStub.restore();
                    expect(readDescStub).to.have.been.calledOnce;
                    expect(readDescStub).to.have.been.calledWith(peripheral.findChar('0xbb00', '0xcc00'));
                    expect(evtFlag).to.be.true;
                    expect(result).to.be.equal(desc);
                    done();
                }
            });
        });
    });

    // describe('#.setNotify', function () {
    //     it('should unable to set if does not have notify or indicate prop', function (done) {
    //         peripheral.setNotify('0xbb00', '0xcc00', true, function (err) {
    //             if (err.message === 'Characteristic not allowed to notify or indication')
    //                 done();
    //         });
    //     });

    //     it('should set ok', function (done) {
    //         notifyStub = sinon.stub(controller, 'notify', generalFunc);

    //         peripheral.findChar('0xbb00', '0xcc00').prop.push('notify');
    //         peripheral.setNotify('0xbb00', '0xcc00', true, function (err) {
    //             if (err)
    //                 console.log(err);
    //             else {
    //                 notifyStub.restore();
    //                 expect(notifyStub).to.have.been.calledOnce;
    //                 expect(notifyStub).to.have.been.calledWith(peripheral.findChar('0xbb00', '0xcc00'), true);
    //                 done();
    //             }
    //         });
    //     });
    // });

    describe('#.read', function () {
        it('should unable to read if does not have read prop', function (done) {
            peripheral.read('0x1800', '0x2a00', function (err) {
                if (err.message === 'Characteristic value not allowed to read.')
                    done();
            });
        });

        it('should read ok, characteristic val equal to write value, emit charChanged event if result not equal to old one', function (done) {
            var readValue = { value: 20 },
                evtFlag = false,
                readStub = sinon.stub(controller, 'read', function () {
                    var deferred = Q.defer();

                    deferred.resolve(readValue);
                    return deferred.promise;
                }),
                charChangedHdlr = function (msg) {
                    var charInfo =  { 
                            periphId: peripheral.addr,
                            type: 'val',
                            servUuid: '0xbb00',
                            charUuid: '0xcc00',
                            value: readValue
                        };

                    if (_.isEqual(charInfo, msg)) {
                        evtFlag = true;
                        controller.removeListener('charChanged', charChangedHdlr);
                    }
                };

            controller.on('charChanged', charChangedHdlr);
            peripheral.read('0xbb00', '0xcc00', function (err, result) {
                if (err)
                    console.log(err);
                else {
                    readStub.restore();
                    expect(readStub).to.have.been.calledOnce;
                    expect(readStub).to.have.been.calledWith(peripheral.findChar('0xbb00', '0xcc00'));
                    expect(peripheral.findChar('0xbb00', '0xcc00').val).to.be.deep.equal(readValue);
                    expect(result).to.be.deep.equal(readValue);
                    expect(evtFlag).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.write', function () {
        it('should unable to write if value type not equal to buffer or object', function (done) {
            peripheral.write('0xbb00', '0xcc00', 'xxx', function (err) {
                if (err.message === 'value must be an object or a buffer')
                    done();
            });
        });

        it('should unable to write if value type not equal to buffer or object', function (done) {
            peripheral.write('0xbb00', '0xcc00', 123, function (err) {
                if (err.message === 'value must be an object or a buffer')
                    done();
            });
        });

        it('should unable to write if does not have write prop', function (done) {
            peripheral.write('0xbb00', '0xcc00', new Buffer([0]), function (err) {
                if (err.message === 'Characteristic value not allowed to write.')
                    done();
            });
        });

        it('should write ok, characteristic val equal to write value, emit charChanged event if value not equal to old one', function (done) {
            var writeVal = { value: 100 },
                evtFlag = false,
                writeStub = sinon.stub(controller, 'write', generalFunc),
                charChangedHdlr = function (msg) {
                    var charInfo =  { 
                            periphId: peripheral.addr,
                            type: 'val',
                            servUuid: '0x1800',
                            charUuid: '0x2a00',
                            value: writeVal
                        };

                    if (_.isEqual(charInfo, msg)) {
                        evtFlag = true;
                        controller.removeListener('charChanged', charChangedHdlr);
                    }
                };

            controller.on('charChanged', charChangedHdlr);
            peripheral.write('0x1800', '0x2a00', writeVal, function (err) {
                if (err)
                    console.log(err);
                else {
                    writeStub.restore();
                    expect(writeStub).to.have.been.calledOnce;
                    expect(writeStub).to.have.been.calledWith(peripheral.findChar('0x1800', '0x2a00'), writeVal);
                    expect(peripheral.findChar('0x1800', '0x2a00').val).to.be.deep.equal(writeVal);
                    expect(evtFlag).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.regCharHdlr', function () {
        it('should register ok', function () {
            var hdlr = function () {};

            expect(peripheral.regCharHdlr('0x1800', '0x2a00', hdlr)).to.be.deep.equal(peripheral);
            expect(peripheral.servs['0x1800'].chars['2'].processInd).to.be.equal(hdlr);
        });
    });
});