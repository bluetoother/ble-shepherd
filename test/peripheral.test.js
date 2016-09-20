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

var central,
    controller;

var generalFunc = function () {
    var deferred = Q.defer();

    deferred.resolve();
    return deferred.promise;
};

describe('Signature Check', function() {
    before(function (done) {
        fs.stat('./test/database/ble1.db', function (err, stats) {
            if (err) {
                fs.stat('./test/database', function (err, stats) {
                    if (err) {
                        fs.mkdir('./test/database', function () {
                            done();
                        });
                    } else {
                        done();
                    }
                });
            } else if (stats.isFile()) {
                fs.unlink(path.resolve('./test/database/ble1.db'), function () {
                    done();
                });
            }
        });
    });

    central = new BShepherd('cc-bnp', 'xxx', { defaultDbPath: __dirname + '/database/ble1.db' });
    controller = central._controller;

    var peripheral = new Periph({ addr: '0x123456789012', addrType: 0 }),
        wakeUpStub = sinon.stub(peripheral, '_wakeUp', generalFunc);
        
    peripheral._controller = controller;

    it('peripheral.tuneLink(interval, latency, timeout[, callback])', function () {
        expect(function () { peripheral.tuneLink({}); }).to.not.throw();

        expect(function () { peripheral.tuneLink([]); }).to.throw('setting must be an object.');
        expect(function () { peripheral.tuneLink('xxx'); }).to.throw('setting must be an object.');
        expect(function () { peripheral.tuneLink(123); }).to.throw('setting must be an object.');
        expect(function () { peripheral.tuneLink(true); }).to.throw('setting must be an object.');
        expect(function () { peripheral.tuneLink(undefined); }).to.throw('setting must be an object.');
        expect(function () { peripheral.tuneLink(null); }).to.throw('setting must be an object.');
    });

    it('peripheral.secure(setting[, callback])', function () {
        expect(function () { peripheral.secure({}); }).to.not.throw();
        expect(function () { peripheral.secure(); }).to.not.throw();

        expect(function () { peripheral.secure([]); }).to.throw('setting must be an object');
        expect(function () { peripheral.secure('xxx'); }).to.throw('setting must be an object');
        expect(function () { peripheral.secure(123); }).to.throw('setting must be an object');
        expect(function () { peripheral.secure(true); }).to.throw('setting must be an object');
    });

    it('returnPasskey(passkey[, callback])', function () {
        expect(function () { peripheral.returnPasskey('000000'); }).to.not.throw();

        expect(function () { peripheral.returnPasskey({}); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey([]); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey(123); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey('xxx'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey('123'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey('abcdef'); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey(undefined); }).to.throw('Passkey must be a string of length 6.');
        expect(function () { peripheral.returnPasskey(null); }).to.throw('Passkey must be a string of length 6.');
    });

    it('peripheral.findChar(sid, cid)', function () {
        peripheral.servs['0x1800'] = { uuid: '0x1800' };

        expect(function () { peripheral.findChar('0x1800', '0x2a00'); }).to.not.throw();

        expect(function () { peripheral.findChar({}, '0x2a00'); }).to.throw('sid must be a string and start with 0x');
        expect(function () { peripheral.findChar([], '0x2a00'); }).to.throw('sid must be a string and start with 0x');
        expect(function () { peripheral.findChar('xxx', '0x2a00'); }).to.throw('sid must be a string and start with 0x');
        expect(function () { peripheral.findChar(true, '0x2a00'); }).to.throw('sid must be a string and start with 0x');
        expect(function () { peripheral.findChar(undefined, '0x2a00'); }).to.throw('sid must be a string and start with 0x');
        expect(function () { peripheral.findChar(null, '0x2a00'); }).to.throw('sid must be a string and start with 0x');

        expect(function () { peripheral.findChar('0x1800', {}); }).to.throw('cid must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', []); }).to.throw('cid must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', 'xxx'); }).to.throw('cid must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', undefined); }).to.throw('cid must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', true); }).to.throw('cid must be a number or a string start with 0x');
        expect(function () { peripheral.findChar('0x1800', null); }).to.throw('cid must be a number or a string start with 0x');
    });

    it('peripheral.write(sid, cid, value, callback)', function () {
        expect(function () { peripheral.write('0x1800', '0x2a00', {}); }).to.not.throw();
        expect(function () { peripheral.write('0x1800', '0x2a00', new Buffer([0])); }).to.not.throw();

        expect(function () { peripheral.write('0x1800', '0x2a00', []); }).to.throw('value must be an object or a buffer');
        expect(function () { peripheral.write('0x1800', '0x2a00', 123); }).to.throw('value must be an object or a buffer');
        expect(function () { peripheral.write('0x1800', '0x2a00', 'xxx'); }).to.throw('value must be an object or a buffer');
        expect(function () { peripheral.write('0x1800', '0x2a00', false); }).to.throw('value must be an object or a buffer');
        expect(function () { peripheral.write('0x1800', '0x2a00', null); }).to.throw('value must be an object or a buffer');
        expect(function () { peripheral.write('0x1800', '0x2a00', undefined); }).to.throw('value must be an object or a buffer');
    });

    it('peripheral.configNotify(sid, cid, config, callback)', function () {
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', true); }).to.not.throw();

        expect(function () { peripheral.configNotify('0x1800', '0x2a00', {}); }).to.throw('config must be a boolean');
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', []); }).to.throw('config must be a boolean');
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', 123); }).to.throw('config must be a boolean');
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', 'xxx'); }).to.throw('config must be a boolean');
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', null); }).to.throw('config must be a boolean');
        expect(function () { peripheral.configNotify('0x1800', '0x2a00', undefined); }).to.throw('config must be a boolean');
    });

    it('peripheral.onNotified(sid, cid, fn)', function () {
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', function () {}); }).to.not.throw();

        expect(function () { peripheral.onNotified('0x1800', '0x2a00', {}); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', []); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', 123); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', 'xxx'); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', true); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', undefined); }).to.throw('fn must be a function');
        expect(function () { peripheral.onNotified('0x1800', '0x2a00', null); }).to.throw('fn must be a function');

        wakeUpStub.restore();
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

    peripheral._controller = controller;
    peripheral.servs['0x1800'] = new Serv(servInfo, peripheral);

    describe('#.connect', function () {
        it('should connect ok', function (done) {
            var connectStub = sinon.stub(central._periphProcessor, 'connPeriph', function () {
                    central.emit('ind', { type: 'devIncoming', periph: peripheral });
                });

            peripheral.connect(function (err) {
                if (err)
                    console.log(err);
                else {
                    connectStub.restore();
                    expect(connectStub).to.have.been.calledOnce;
                    expect(connectStub).to.have.been.calledWith(peripheral);
                    done();
                }
            });
        });

        it('should do nothing if connHdl not equal to null or undefined', function (done) {
            peripheral.connHandle = 0;

            peripheral.connect(function (err) {
                if (err)
                    console.log(err);
                else 
                    done();
            });
        });
    });

    describe('#.disconnect', function () {
        it('should disconnect ok', function (done) {
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

            peripheral.connHandle = null;

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

    describe('#.maintain', function () {
        var servInfo1 = {
                uuid: '0x1800',
                startHandle: 1,
                endHandle: 20,
                charList: [ 
                    {
                        uuid: '0x2a00',
                        handle: 2,
                        prop: ['write']
                    }
                ]
            },
            servInfo2 = {
                uuid: '0xbb00',
                startHandle: 21,
                endHandle: 25,
                charList: [ 
                    {
                        uuid: '0xcc00',
                        handle: 22,
                        prop: ['read']
                    },
                    {
                        uuid: '0xcc01',
                        handle: 24,
                        prop: ['read']
                    }
                ]
            };

        peripheral.servs['1'] = new Serv(servInfo1, peripheral);
        peripheral.servs['21'] = new Serv(servInfo2, peripheral);

        it('should read characteristic value of service 0xcc00', function (done) {
            var charValue = {
                    value: 10, 
                    changed: 'xxx'
                },
                readStub = sinon.stub(controller, 'read', function () {
                    var deferred = Q.defer();

                    deferred.resolve(charValue);
                    return deferred.promise;
                }),
                charChangedHdlr,
                evtCount = 0;

            charChangedHdlr = function (msg) {
                var charInfo =  { 
                        type: 'value',
                        sid: {
                            uuid: '0xbb00',
                            handle: 21
                        },
                        cid: null,
                        value: charValue,
                        diff: charValue
                    };

                delete msg.periph;

                charInfo.cid = { uuid: '0xcc00', handle: 22 };
                if (_.isEqual(charInfo, msg)) evtCount += 1;
                charInfo.cid = { uuid: '0xcc01', handle: 24 };
                if (_.isEqual(charInfo, msg)) evtCount += 1;

                if (evtCount === 2) controller.removeListener('charChanged', charChangedHdlr);
            };

            peripheral.status = 'online';
            central.regPeriph(peripheral);
            controller.on('charChanged', charChangedHdlr);
            peripheral.maintain(function (err) {
                var char1 = peripheral.servs['21'].chars['22'],
                    char2 = peripheral.servs['21'].chars['24'];

                if (err)
                    console.log(err);
                else {
                    readStub.restore();
                    expect(readStub).to.have.been.calledTwice;
                    expect(readStub).to.have.been.calledWith(char1);
                    expect(readStub).to.have.been.calledWith(char2);
                    expect(char1.value).to.be.deep.equal(charValue);
                    expect(char2.value).to.be.deep.equal(charValue);
                    expect(evtCount).to.be.equal(2);
                    done();
                }
            });
        });
    });

    describe('#.tuneLink', function () {
        it('should update success and change linkParams property to new setting', function (done) {
            var updateLinkParamStub = sinon.stub(controller, 'updateLinkParam', generalFunc),
                setting = {
                    interval: 0x0010,
                    latency: 0x0000,
                    timeout: 0x0190
                };

            peripheral.status = 'online';
            peripheral.tuneLink(setting, function (err) {
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
            peripheral.tuneLink({}, function (err) {
                expect(err.message).to.be.equal('Peripheral is not online.');
                done();
            });
        });
    });

    describe('#.secure', function () {
        it('should secure success with bonding and create security model', function (done) {
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

            peripheral.status = 'online';
            peripheral.secure(setting, function (err) {
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
        it('should secure success without bonding and create security model', function (done) {
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

            peripheral.secure(setting, function (err) {
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

    describe('#.returnPasskey', function () {
        it('should pass success', function (done) {
            var passStub = sinon.stub(controller, 'passkeyUpdate', generalFunc),
                passkey = '123456';

            peripheral.returnPasskey(passkey, function (err) {
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
            expect(peripheral.findChar('0xbb00', '0xcc00')).to.be.deep.equal(peripheral.servs['21'].chars['22']);
            expect(peripheral.findChar('0xbb00', 22)).to.be.deep.equal(peripheral.servs['21'].chars['22']);
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
                        type: 'desc',
                        sid: {
                            uuid: '0xbb00',
                            handle: 21
                        },
                        cid: { 
                            uuid: '0xcc00', 
                            handle: 22 
                        },
                        value: desc
                    };

                delete msg.periph;

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

    describe('#.configNotify', function () {
        it('should unable to set if does not have notify or indicate prop', function (done) {
            peripheral.configNotify('0xbb00', '0xcc00', true, function (err) {
                if (err.message === 'Characteristic not allowed to notify or indication')
                    done();
            });
        });

        it('should set ok', function (done) {
            notifyStub = sinon.stub(controller, 'notify', generalFunc);

            peripheral.findChar('0xbb00', '0xcc00').prop.push('notify');
            peripheral.configNotify('0xbb00', '0xcc00', true, function (err) {
                if (err)
                    console.log(err);
                else {
                    notifyStub.restore();
                    expect(notifyStub).to.have.been.calledOnce;
                    expect(notifyStub).to.have.been.calledWith(peripheral.findChar('0xbb00', '0xcc00'), true);
                    done();
                }
            });
        });
    });

    describe('#.read', function () {
        it('should unable to read if does not have read prop', function (done) {
            peripheral.read('0x1800', '0x2a00', function (err) {
                if (err.message === 'Characteristic value not allowed to read.')
                    done();
            });
        });

        it('should read ok, characteristic val equal to write value, emit charChanged event if result not equal to old one', function (done) {
            var readValue = { 
                    value: 10,
                    changed: 'xxxxx' 
                },
                evtFlag = false,
                readStub = sinon.stub(controller, 'read', function () {
                    var deferred = Q.defer();

                    deferred.resolve(readValue);
                    return deferred.promise;
                }),
                charChangedHdlr = function (msg) {
                    var charInfo =  { 
                            type: 'value',
                            sid: {
                                uuid: '0xbb00',
                                handle: 21
                            },
                            cid: { 
                                uuid: '0xcc00', 
                                handle: 22 
                            },
                            value: readValue,
                            diff: {
                                changed: 'xxxxx' 
                            },
                        };

                    delete msg.periph;

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
                    expect(peripheral.findChar('0xbb00', '0xcc00').value).to.be.deep.equal(readValue);
                    expect(result).to.be.deep.equal(readValue);
                    expect(evtFlag).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.write', function () {
        it('should unable to write if does not have write prop', function (done) {
            peripheral.write('0xbb00', '0xcc00', new Buffer([0]), function (err) {
                if (err.message === 'Characteristic value not allowed to write.')
                    done();
            });
        });

        it('should write ok, characteristic val equal to write value, emit charChanged event if value not equal to old one', function (done) {
            var writeVal = { 
                    value: 100,
                    changed: 'xxxxx' 
                },
                evtFlag = false,
                writeStub = sinon.stub(controller, 'write', generalFunc),
                charChangedHdlr = function (msg) {
                    var charInfo =  { 
                            type: 'value',
                            sid: {
                                uuid: '0x1800',
                                handle: 1
                            },
                            cid: { 
                                uuid: '0x2a00', 
                                handle: 2 
                            },
                            value: writeVal,
                            diff: writeVal
                        };

                    delete msg.periph;

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
                    expect(peripheral.findChar('0x1800', '0x2a00').value).to.be.deep.equal(writeVal);
                    expect(evtFlag).to.be.true;
                    done();
                }
            });
        });

        it('should write ok, characteristic val equal to write value, emit charChanged event if value not equal to old one', function (done) {
            var writeVal = { 
                    value: 10,
                    changed: 'xxxxx' 
                },
                evtFlag = false,
                writeStub = sinon.stub(controller, 'write', generalFunc),
                charChangedHdlr = function (msg) {
                    var charInfo =  { 
                            type: 'value',
                            sid: {
                                uuid: '0x1800',
                                handle: 1
                            },
                            cid: { 
                                uuid: '0x2a00', 
                                handle: 2 
                            },
                            value: writeVal,
                            diff: {
                                value: 10
                            }
                        };

                    delete msg.periph;

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
                    expect(peripheral.findChar('0x1800', '0x2a00').value).to.be.deep.equal(writeVal);
                    expect(evtFlag).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.onNotified', function () {
        it('should register ok', function () {
            var hdlr = function () {};

            expect(peripheral.onNotified('0x1800', '0x2a00', hdlr)).to.be.deep.equal(peripheral);
            expect(peripheral.servs['1'].chars['2'].processInd).to.be.equal(hdlr);

            // try {
            //     fs.unlink(path.resolve(__dirname, '../lib/database/ble.db'));
            // } catch (e) {
            //     console.log(e);
            // }
        });
    });
});
