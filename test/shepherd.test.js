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
    GATTDEFS = require('../lib/defs/gattdefs');

try {
    fs.unlinkSync(path.resolve(__dirname + '/../lib/database/ble.db'));
} catch (e) {
    console.log(e);
}

var central = new BShepherd('cc-bnp', 'xxx'),
    controller = central._controller;

central._periphBox._db._db.loadDatabase();

describe('Constructor Check', function () {
    it('should has all correct members after new', function () {
        expect(central._subModule).to.be.equal('cc-bnp');
        expect(central._controller).to.be.an('object');
        expect(central._periphBox).to.be.an('object');
        expect(central._enable).to.be.equal('pending');
        expect(central._resetting).to.be.false;
        expect(central._blockerState).to.be.null;
        expect(central._permitJoinTimer).to.be.null;
        expect(central._spCfg).to.be.deep.equal({ path: 'xxx', options: undefined });
        expect(central._plugins).to.be.an('object');

        expect(central.bleCentral).to.be.null;
        expect(central.init).to.be.a('function');
        expect(central.setScanRule).to.be.a('function');

        expect(central.setPermitJoinTime).to.be.a('function');
        expect(central.getPermitJoinTime).to.be.a('function');
        expect(central.joinTimeCountdown).to.be.a('function');
        expect(central.isBlackListed).to.be.a('function');
        expect(central.ban).to.be.a('function');
        expect(central.unban).to.be.a('function');
        expect(central.isWhiteListed).to.be.a('function');
        expect(central.allow).to.be.a('function');
        expect(central.disallow).to.be.a('function');
        expect(central._ban).to.be.a('function');
        expect(central._unban).to.be.a('function');
        expect(central._onSignin).to.be.a('function');
        expect(central._onAsyncExit).to.be.a('function');
    });

    it('should throw if subModule given with cc-bnp or noble', function () {
        expect(function () { new BShepherd('cc-bnp', 'xxx'); }).to.not.throw();

        expect(function () { new BShepherd({}); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd([]); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd('xxx'); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(123); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(false); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(undefined); }).to.throw('subModule must be given with cc-bnp or noble');
        expect(function () { new BShepherd(null); }).to.throw('subModule must be given with cc-bnp or noble');
    });

    it('should throw if path not given with string with cc-bnp', function () {
        expect(function () { new BShepherd('cc-bnp'); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', {}); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', []); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', 123); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', false); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', undefined); }).to.throw('path must be given in string');
        expect(function () { new BShepherd('cc-bnp', null); }).to.throw('path must be given in string');

        ccbnp.removeAllListeners('ind');
    });
});

describe('Signature Check', function() {
    // var central = new BShepherd('cc-bnp', 'xxx');

    it('central.setNwkParams(type, setting[, callback])', function () {
        expect(function () { central.setNwkParams('scan', {}); }).to.not.throw();

        expect(function () { central.setNwkParams({}, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams([], {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams('xxx', {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(123, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(false, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(undefined, {}); }).to.throw('type must be a string of scan or link');
        expect(function () { central.setNwkParams(null, {}); }).to.throw('type must be a string of scan or link');

        expect(function () { central.setNwkParams('link', []); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', 'xxx'); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', 123); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', false); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', undefined); }).to.throw('setting must be an object.');
        expect(function () { central.setNwkParams('link', null); }).to.throw('setting must be an object.');
    });

    it('central.permitJoin(duration)', function () {
        expect(function () { central.permitJoin(60); }).to.not.throw();

        expect(function () { central.permitJoin({}); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin([]); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin('xxx'); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(false); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(undefined); }).to.throw('duration must be a number');
        expect(function () { central.permitJoin(null); }).to.throw('duration must be a number');
    });

    it('central.find(addrOrHdl)', function () {
        expect(function () { central.find(''); }).to.not.throw();
        expect(function () { central.find(0); }).to.not.throw();

        expect(function () { central.find({}); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find([]); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(false); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(undefined); }).to.throw('addrOrHdl must be a string or a number');
        expect(function () { central.find(null); }).to.throw('addrOrHdl must be a string or a number');
    });

    it('central.regGattDefs(type, regObjs)', function () {
        expect(function () { central.regGattDefs('service', {}); }).to.not.throw();

        expect(function () { central.regGattDefs({}, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs([], {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs('xxx', {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(123, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(true, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(undefined, {}); }).to.throw('type must be service or characteristic.');
        expect(function () { central.regGattDefs(null, {}); }).to.throw('type must be service or characteristic.');

        expect(function () { central.regGattDefs('service', 'xxx'); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', 123); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', true); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', undefined); }).to.throw('regObjs must be an object or an array');
        expect(function () { central.regGattDefs('service', null); }).to.throw('regObjs must be an object or an array');
    });

    it('central.regPlugin(devName, plugin)', function () {
        expect(function () { central.regPlugin('relay', { examine: function() {} }); }).to.not.throw();

        expect(function () { central.regPlugin({}, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin([], { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(123, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(true, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(undefined, { examine: function() {} }); }).to.throw('devName should be a string');
        expect(function () { central.regPlugin(null, { examine: function() {} }); }).to.throw('devName should be a string');

        expect(function () { central.regPlugin('switch', {}); }).to.throw('You should provide examine function');
        expect(function () { central.regPlugin('switch', []); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', 'xxx'); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', 123); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', true); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', undefined); }).to.throw('plugin should be an object');
        expect(function () { central.regPlugin('switch', null); }).to.throw('plugin should be an object');
    });

    it('central.regLocalServ(servInfo[, callback])', function () {
        expect(function () { central.regLocalServ([]); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(123); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ('xxx'); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(true); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(undefined); }).to.throw('servInfo must be an object');
        expect(function () { central.regLocalServ(null); }).to.throw('servInfo must be an object');

        expect(function () { central.regLocalServ({ charsInfo: {} }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: 123 }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: 'xxx' }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: true }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: undefined }); }).to.throw('servInfo.charsInfo must be an array.');
        expect(function () { central.regLocalServ({ charsInfo: null }); }).to.throw('servInfo.charsInfo must be an array.');

        expect(function () { central.regLocalServ({ charsInfo: [], uuid: {} }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: [] }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: 123 }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: true }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: undefined }); }).to.throw('servInfo.uuid must be a string and start with 0x');
        expect(function () { central.regLocalServ({ charsInfo: [], uuid: null }); }).to.throw('servInfo.uuid must be a string and start with 0x');
    });

    it('central.blocker(onOff[, type])', function () {
        expect(function () { central.blocker(true); }).to.not.throw();

        expect(function () { central.blocker([]); }).to.not.throw();
        expect(function () { central.blocker({}); }).to.not.throw();
        expect(function () { central.blocker(123); }).to.not.throw();
        expect(function () { central.blocker('xxx'); }).to.not.throw();
        expect(function () { central.blocker(undefined); }).to.not.throw();
        expect(function () { central.blocker(null); }).to.not.throw();
    });
});

describe('Functional Check', function () {
    // var central = new BShepherd('cc-bnp', 'xxx'),
    //     controller = central._controller;

    var periph1 = new Periph({ addr: '0x123456789012', addrType: 0 }),
        periph2 = new Periph({ addr: '0x112233445566', addrType: 1 }),
        periph3 = new Periph({ addr: '0x665544332211', addrType: 2});

    var generalFunc = function () {
        var deferred = Q.defer();

        deferred.resolve();
        return deferred.promise;
    };

    describe('#.start', function () {
        it('should start ok, _enable should be true', function (done) {
            var centralAddr = '0x111111111111';
                initStub = sinon.stub(controller, 'init', function () {
                var deferred = Q.defer();

                deferred.resolve(centralAddr);
                setTimeout(function () {
                    controller.emit('ready');
                }, 50);
                return deferred.promise;
            });

            central.start(function (err) {
                if (err)
                    console.log(err);
                else {
                    initStub.restore();
                    expect(central.bleCentral.addr).to.be.equal(centralAddr);
                    expect(central._enable).to.be.equal(true);
                    expect(initStub).to.have.been.calledOnce;
                    expect(initStub).to.have.been.calledWith({ path: 'xxx', options: undefined });
                    done();
                }
            });
        });
    });

    describe('#.setNwkParams', function () {
        it('should set scan params ok', function (done) {
            var setting = {
                    time: 3000,
                    interval: 0,
                    windows: 8
                },
                setScanParamsStub = sinon.stub(controller, 'setScanParams', generalFunc);

            central.setNwkParams('scan', setting, function (err) {
                if (err)
                    console.log(err);
                else {
                    setScanParamsStub.restore();
                    expect(setScanParamsStub).to.have.been.calledOnce;
                    expect(setScanParamsStub).to.have.been.calledWith(setting);
                    done();
                }
            });
        });

        it('should set link params ok', function (done) {
            var setting = {
                    interval: 0x000c,
                    latency: 0x0000,
                    timeout: 0x00c8
                },
                setLinkParamsStub = sinon.stub(controller, 'setLinkParams', generalFunc);

            central.setNwkParams('link', setting, function (err) {
                if (err)
                    console.log(err);
                else {
                    setLinkParamsStub.restore();
                    expect(setLinkParamsStub).to.have.been.calledOnce;
                    expect(setLinkParamsStub).to.have.been.calledWith(setting);
                    done();
                }
            });
        });
    });

    describe('#.permitJoin', function () {
        it('should trigger event with duration equal to 0', function (done) {
            var pjHdlr = function (msg) {
                    if (msg.type === 'NWK_PERMITJOIN' && msg.data === 0) {
                        central.removeListener('IND', pjHdlr);
                        done();
                    }
                };

            central.on('IND', pjHdlr);
            central.permitJoin(0);
        });

        it('should trigger event and permitJoin counter with duration not equal to 0', function (done) {
            var duration = 10,
                pjHdlr = function (msg) {
                    if (msg.type === 'NWK_PERMITJOIN' && msg.data === duration ) {
                        central.removeListener('IND', pjHdlr);
                        done();
                    }
                };

            central.on('IND', pjHdlr);
            central.permitJoin(duration);
        });
    });

    describe('#.listDevices', function () {
        it('should list all registered devices', function (done) {
            central.regPeriph(periph1).then(function () {
                return central.regPeriph(periph2);
            }).then(function () {
                return central.regPeriph(periph3);
            }).then(function () {
                result = central.listDevices();

                expect(result.length).to.be.equal(3);
                expect(result[0].addr).to.be.equal(periph1.addr);
                expect(result[0].addrType).to.be.equal(periph1.addrType);
                expect(result[0].status).to.be.equal(periph1.status);
                expect(result[0].connHdl).to.be.equal(periph1.connHdl);
                expect(result[0].servList).to.be.deep.equal({});

                done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

    describe('#.find', function () {
        it('should find nothing', function () {
            expect(central.find(0)).to.be.undefined;
        });
        it('should find peripherals', function () {
            expect(central.find('0x123456789012')).to.be.deep.equal(periph1);
            expect(central.find('0x112233445566')).to.be.deep.equal(periph2);
            expect(central.find('0x665544332211')).to.be.deep.equal(periph3);
        });
    });

    describe('#.regGattDefs', function () {
        it('should register success and add to GATT definitions', function () {
            var toRegServ = [{name: 'Test', uuid: '0xFFF0'}];

            expect(central.regGattDefs('service', toRegServ)).to.be.deep.equal(central);
            expect(GATTDEFS.ServUuid.get(0xfff0)).to.be.a('object');
        });

        it('should register success if register item equal to previous item', function () {
            var toRegServ = [{name: 'Test', uuid: '0xFFF0'}];

            expect(central.regGattDefs('service', toRegServ)).to.be.deep.equal(central);
        });

        it('should register fail if register item not equal to previous item', function () {
            var toRegServ = [{name: 'test', uuid: '0xFFF0'}];

            expect(function () { central.regGattDefs('service', toRegServ); }).to.throw('service uuid of 0xFFF0 is conflict with GATT specifications.');
        });
    });

    describe('#.regPlugin', function () {
        it('should register success and add plugin to _plugins property', function () {
            var plugin = {
                    examine: function () {

                    },
                    gattDefs: {
                        service: [{name: 'Test2', uuid: '0xFFF1'}]
                    }
                };

            expect(central.regPlugin('xxx', plugin)).to.be.true;
            expect(central._plugins['xxx']).to.be.deep.equal(plugin.examine);
            expect(GATTDEFS.ServUuid.get(0xfff1)).to.be.a('object');
        });
    });

    describe('#.regLocalServ', function () {
        it('should register success and create service instance in bleCentral', function (done) {
            var addServStub = sinon.stub(ccbnp.gatt, 'addService', generalFunc),
                addAttrStub = sinon.stub(ccbnp.gatt, 'addAttribute', function () {
                    var deferred = Q.defer(),
                        result = { 
                            payload: new Buffer([0x01, 0x00, 0x05, 0x00])
                        };

                    deferred.resolve(result);
                    return deferred.promise;
                });

            var servInfo = {
                    uuid: '0x1800', 
                    charsInfo: [
                        // {uuid: '0x2a00', permit: ['Read'], prop: ['Read'], val: {name:"Simple BLE Central"}},
                        { uuid: '0x2a01', permit: ['Read'], prop: ['Read'], val: { category:0 } },
                        { uuid: '0x2a02', permit: ['Read', 'Write'], prop: ['Read', 'Write'], val: { flag: 0 } }
                    ]
                };

            central.regLocalServ(servInfo, function (err, result) {
                if (err)
                    console.log(err);
                else {
                    addServStub.restore();
                    addAttrStub.restore();
                    expect(addServStub).to.have.been.calledOnce;
                    expect(addServStub).to.have.been.calledWith('0x2800', 5);
                    expect(addAttrStub).to.have.been.callCount(4);
                    expect(addAttrStub).to.have.been.calledWith('0x2a01', 1);
                    expect(addAttrStub).to.have.been.calledWith('0x2803', 1);
                    expect(addAttrStub).to.have.been.calledWith('0x2a02', 3);
                    expect(addAttrStub).to.have.been.calledWith('0x2803', 1);
                    expect(result.startHdl).to.be.equal(1);
                    expect(result.endHdl).to.be.equal(5);
                    expect(central.bleCentral.servs[0]).to.be.deep.equal(result);
                    done();
                }
            });
        });
    });

    describe('#.blocker', function () {
        it('should enable blocker with blacklist', function () {
            expect(central.blocker(true)).to.be.deep.equal(central);
            expect(central._blockerState).to.be.equal('black');
        });

        it('should enable blocker with blacklist', function () {
            expect(central.blocker(true, 'black')).to.be.deep.equal(central);
            expect(central._blockerState).to.be.equal('black');
        });

        it('should enable blocker with whitelist', function () {
            expect(central.blocker(true, 'white')).to.be.deep.equal(central);
            expect(central._blockerState).to.be.equal('white');
        });

        it('should disable blocker', function () {
            expect(central.blocker(false)).to.be.deep.equal(central);
            expect(central._blockerState).to.be.null;
        });
    });

    describe('#.ban', function () {
        it('should ban device from network and add to blacklist', function (done) {
            var removeStub = sinon.stub(periph1, 'remove', function (callback) {
                callback(null);
            });

            central.blocker(true);
            central.ban(periph1.addr, function (err) {
                if (err)
                    console.log(err);
                else {
                    removeStub.restore();
                    expect(removeStub).to.have.been.calledOnce;
                    expect(central.isBlackListed(periph1.addr)).to.be.true;
                    expect(central.isWhiteListed(periph1.addr)).to.be.false;
                    done();
                }
            });
        });
    });

    describe('#.unban', function () {
        it('should unban device from network and add to whitelist', function () {
            central.unban(periph1.addr, function (err) {
                if (err)
                    console.log(err);
                else {
                    expect(central.isBlackListed(periph1.addr)).to.be.false;
                    expect(central.isWhiteListed(periph1.addr)).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.allow', function () {
        it('should allow device to network and add to whitelist', function () {
            central.allow(periph1.addr, function (err) {
                if (err)
                    console.log(err);
                else {
                    expect(central.isBlackListed(periph1.addr)).to.be.false;
                    expect(central.isWhiteListed(periph1.addr)).to.be.true;
                    done();
                }
            });
        });
    });

    describe('#.disallow', function () {
        it('should disallow device to network and add to blacklist', function (done) {
            var removeStub = sinon.stub(periph1, 'remove', function (callback) {
                callback(null);
            });

            central.blocker(true);
            central.disallow(periph1.addr, function (err) {
                if (err)
                    console.log(err);
                else {
                    removeStub.restore();
                    expect(removeStub).to.have.been.calledOnce;
                    expect(central.isBlackListed(periph1.addr)).to.be.true;
                    expect(central.isWhiteListed(periph1.addr)).to.be.false;
                    done();
                }
            });
        });
    });

    describe('#.stop', function () {
        it('should stop ok, permitJoin 0 should be fired, _enable should be false', function (done) {
            var cancelScanStub = sinon.stub(controller, 'cancelScan', generalFunc),
                closeStub = sinon.stub(controller, 'close', generalFunc);

            var pjFlag = false,
                pjHdlr = function (msg) {
                    if (msg.type === 'NWK_PERMITJOIN' && msg.data === 0) {
                        pjFlag = true;
                        central.removeListener('IND', pjHdlr);
                    }
                };

            central.on('IND', pjHdlr);

            central.stop(function (err) {
                if (err) 
                    console.log(err);
                else {
                    cancelScanStub.restore();
                    closeStub.restore();
                    expect(pjFlag).to.be.equal(true);
                    expect(central._enable).to.be.equal(false);
                    expect(cancelScanStub).to.have.been.calledOnce;
                    expect(closeStub).to.have.been.calledOnce;
                    done();
                }
            });
        });
    });
});