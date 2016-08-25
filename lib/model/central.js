/*jslint node: true */
'use strict';

var _ = require('busyman'),
	Q = require('q'),
	// ccbnp = require('cc-bnp');
    ccbnp = require('../../../bluetoother/cc-bnp');

var GATTDEFS = require('../defs/gattdefs'),
	bleutil = require('../components/bleutil');

function Central (addr) {
    this.role = 'central';
    this.addr = addr;
    this.servs = [];
}

Central.prototype.regServ = function (servInfo) {
    var self = this,
        deferred = Q.defer(),
        serv,
        attrs,
        permit = 0,
        addAttrFuncs = [];

    serv = new Service(servInfo.uuid, servInfo.charsInfo, servInfo.name);
    attrs = serv.getAttrs();

    ccbnp.gatt.addService('0x2800', (_.size(attrs) + 1)).then(function (result) {
        _.forEach(attrs, function (attr) {
            _.forEach(attr.permit, function (permitName) {
                permit += GATTDEFS.Permit.get(permitName).value;
            });
            addAttrFuncs.push(ccbnp.gatt.addAttribute(attr.uuid, permit));
            permit = 0;
        });
        return Q.all(addAttrFuncs);
    }).then(function (result) {
        var hdlBuf;
        hdlBuf = _.last(result).payload;
        serv.startHandle = hdlBuf.readUInt16LE(0);
        serv.endHandle = hdlBuf.readUInt16BE(1);
        try {
            serv._assignHdls();
            self.servs.push(serv);
        	ccbnp.regUuidHdlTable(65534, serv.expUuidHdlTable());
        	deferred.resolve(serv);
        } catch (err) {
            deferred.reject(err);
        }        
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

Central.prototype.delServ = function (handle, callback) {
    var self = this,
        deferred = Q.defer();

    if (!_.isNumber(handle)) {
        deferred.reject(new TypeError('handle must be a number'));
    } else {
        ccbnp.gatt.delService(handle).then(function (result) {
            _.forEach(self.servs, function (serv) {
                if (serv.startHandle === handle) { self.servs.splice(_.indexOf(self.servs, serv), 1); }
            });
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }

    return deferred.promise.nodeify(callback);
};

Central.prototype.processAttMsg = function (attMsg) {
    var deferred = Q.defer(),
        servs = [],
        attrs = [],
        attr,
        char,
        reqConnHandle = attMsg.data.connHandle,
        reqStartHandle = attMsg.data.startHandle,
        reqEndHandle = attMsg.data.endHandle,
        reqHandle = attMsg.data.handle,
        reqUuid = attMsg.data.type,
        reqVal,
        rspObj = {},
        uuidObj;

    _.forEach(this.servs, function (serv) {
        var servAttrs = serv.getAttrs();
        attrs = attrs.concat(servAttrs);
    });

    switch (attMsg.evtName) {
        case 'AttExchangeMtuReq':
            ccbnp.att.errorRsp(reqConnHandle, 0x02, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttFindInfoReq':
            attrs = _.filter(attrs, function (attr) {
                return  (attr.handle >= reqStartHandle) && (attr.handle <= reqEndHandle);
            });
            attrs = _.sortBy(attrs, ['handle']);
            _.forEach(attrs, function (attr, i) {
                rspObj['handle' + i] = attr.handle;
                rspObj['uuid' + i] = attr.uuid;
            });
            ccbnp.att.findInfoRsp(reqConnHandle, 1, rspObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
            break;
        case 'AttFindByTypeValueReq': 
            if (reqUuid === '0x2800') {
                reqVal = bleutil.buf2Str(attMsg.data.value);
                _.forEach(this.servs, function (serv) {
                    if (serv.uuid === reqVal && (serv.startHandle >= reqStartHandle) && (serv.endHandle <= reqEndHandle)) {
                        rspObj.attrHandle0 = serv.startHandle;
                        rspObj.grpEndHandle0 = serv.endHandle;
                    }
                });
                if (_.isEmpty(rspObj)) { 
                    ccbnp.att.errorRsp(reqConnHandle, 0x06, 0x0001, 0x0A);
                    deferred.resolve();
                } else {
                    ccbnp.att.findByTypeValueRsp(reqConnHandle, rspObj, reqUuid).then(function () {
                        deferred.resolve();
                    }).fail(function (err) {
                        deferred.reject(err);
                    }).done();
                }
            } else {
                ccbnp.att.errorRsp(reqConnHandle, 0x06, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            } 
            break;
        case 'AttReadByTypeReq': 
            if (!GATTDEFS.CharUuid.get(_.parseInt(reqUuid, 16))) {
                ccbnp.att.errorRsp(reqConnHandle, 0x08, 1, 14);
                deferred.reject(new Error('Characteristic: ' + reqUuid + ' not register.'));
            } else {
                attrs = _.filter(attrs, function (attr) {
                    return (attr.uuid === reqUuid) && (attr.handle >= reqStartHandle) && (attr.handle <= reqEndHandle);
                });
                attrs = _.sortBy(attrs, ['handle']);
                _.forEach(attrs, function (attr, i) {
                    rspObj['attrHandle' + i] = attr.handle;
                    rspObj['attrVal' + i] = attr.value;
                });
                ccbnp.att.readByTypeRsp(reqConnHandle, _.size(rspObj), rspObj , reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadReq': 
            attr = _.find(attrs, { handle: reqHandle });
            if (!GATTDEFS.CharUuid.get(_.parseInt(attr.uuid, 16))) {
                ccbnp.att.errorRsp(reqConnHandle, 0x0a, reqHandle, 14);
                deferred.reject(new Error('Characteristic: ' + attr.uuid + ' not register.'));
            } else {
                ccbnp.att.readRsp(reqConnHandle, attr.value, attr.uuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadBlobReq':
            ccbnp.att.errorRsp(reqConnHandle, 0x0c, reqHandle, 0x0B);
            deferred.resolve();
            break;
        case 'AttReadMultiReq': //TODO, uuid not register, 0x0e
            reqHandle = _.values(attMsg.data);
            _.forEach(attrs, function (attr) {
                _.forEach(reqHandle, function (handle, i) {
                    if (attr.handle === handle) {
                        rspObj[attr.handle] = attr.value;
                        uuidObj['uuid' + i] = attr.uuid;
                    }
                });
            });
            ccbnp.att.readMultiRsp(reqConnHandle, rspObj, uuidObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
            break;
        case 'AttReadByGrpTypeReq':
            if (reqUuid === '0x2800') {
                servs = _.filter(this.servs, function (serv) {
                    return (serv.startHandle >= reqStartHandle) && (serv.endHandle <= reqEndHandle);
                });

                _.forEach(servs, function (serv, i) {
                    rspObj['attrHandle' + i] = serv.startHandle;
                    rspObj['endGroupHandle' + i] = serv.endHandle;
                    rspObj['attrVal' + i] = bleutil.str2Buf(serv.uuid);
                });
                ccbnp.att.readByGrpTypeRsp(reqConnHandle, 6, rspObj, reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            } else {
                ccbnp.att.errorRsp(reqConnHandle, 0x10, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            }
            break;
        case 'AttWriteReq': 
            attr = _.find(attrs, { handle: reqHandle });
            attr.value = attMsg.data.value;

            _.forEach(this.servs, function (serv) {
                var result;
                result = serv.findChar(attr.handle);
                if (result) { char = result; }
            });

            if (!char) {
                deferred.reject('Can not find Characteristic');
            } else {
                if (attr.uuid === '0x2902') {
                    if (attr.value === 0x0001) { char.onIndMessage('notif'); }
                    if (attr.value === 0x0002) { char.onIndMessage('ind'); }
                } else {
                    char.onMessage(attr.uuid, attMsg.data);
                }
                
                ccbnp.att.writeRsp(reqConnHandle).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        //TODO
        case 'AttPrepareWriteReq':
            ccbnp.att.errorRsp(reqConnHandle, 0x16, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttExecuteWriteReq':
            ccbnp.att.errorRsp(reqConnHandle, 0x18, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;

        default:
            deferred.reject(new Error('Unable to handle this command.'));
            break;
    }

    return deferred.promise;
};

/*************************************************************************************************/
/*** Local Service Constructor                                                                 ***/
/*************************************************************************************************/
function Service (uuid, charsInfo, name) {
    this.uuid = uuid;
    this.startHandle = null;
    this.endHandle = null;
    this.name = name;
    this.chars = {};

    this._addChars(charsInfo);
    if (!this.name && GATTDEFS.ServUuid.get(_.parseInt(this.uuid))) {
        this.name = GATTDEFS.ServUuid.get(_.parseInt(this.uuid)).key;
    }
}

Service.prototype._addChars = function (charsInfo) {
	var self = this;

	if (!_.isArray(charsInfo)) { throw new TypeError('Argument of addChars() must be an array.'); }
	_.forEach(charsInfo, function (charInfo) {
		self.chars[charInfo.uuid] = new Characteristic(charInfo);
	});
};

Service.prototype._assignHdls = function () {
    var attrs = this.getAttrs(),
        startHandle = this.startHandle;

    _.forEach(attrs, function (attr) {
        startHandle += 1;
        attr.handle = startHandle;
        if (attr.uuid === '0x2803') {
            attr.value.handle = attr.handle + 1;
        }
    });

    if (startHandle !== this.endHandle) {
        return new Error('An error occurred when assigning handles');
    }
};

Service.prototype.expUuidHdlTable = function () {
    var uuidHdlTable = {};

    _.forEach(this.chars, function (char, name) {
        _.forEach(char.attrs, function (attr) {
            if (attr.uuid === name) {
                uuidHdlTable[attr.handle] = attr.uuid;
            }
        });
    });

    return uuidHdlTable;
};

Service.prototype.findChar = function (handle) {
    var result;

    if (!_.isNumber(handle)) { throw new TypeError('Argument of addChars() must be a number.'); }
    _.forEach(this.chars, function (char) {
        _.forEach(char.attrs, function (attr) {
            if (attr.handle === handle) { result = char; }
        });
    });

    return result;
};

Service.prototype.getAttrs = function () {
    var attrs = [];

    _.forEach(this.chars, function (char) {
        attrs = attrs.concat(char.attrs);
    });

    return attrs;
};

/*************************************************************************************************/
/*** Local Characteristic Constructor                                                          ***/
/*************************************************************************************************/
function Characteristic (charInfo) {
    this.name = charInfo.name ? charInfo.name : null; 
    this.uuid = charInfo.uuid;
    this.info = charInfo;
    this.attrs = [];

    this.onMessage = function (uuid, data) {};
    this.onIndMessage = function (type) {};

    this._addAttrs(charInfo);
    if (!this.name) {
    	this.name = GATTDEFS.CharUuid.get(_.parseInt(this.uuid)).key;
    }
}

Characteristic.prototype._addAttrs = function (charInfo) {
	var self = this,
		charVal;

    if (!_.isPlainObject(charInfo)) { throw new TypeError('Argument of addAttrs() must be an object.'); }

    charVal = {
        uuid: charInfo.uuid,
        prop: charInfo.prop,
        handle: null
    };
	this.attrs.push(new Attribute('0x2803', ['Read'], charVal));
	this.attrs.push(new Attribute(charInfo.uuid, charInfo.permit, charInfo.value));
    this.attrs[0].value.handle = this.attrs[1].handle;

    if (charInfo.ccc) {
        this.attrs.push(new Attribute('0x2902', ['Read', 'Write'], charInfo.ccc));
    }
	if (charInfo.desc) {
		this.attrs.push(new Attribute('0x2901', ['Read'], charInfo.desc));
	}
};

/*************************************************************************************************/
/*** Local Attribute Constructor                                                               ***/
/*************************************************************************************************/
function Attribute (uuid, permit, value) {
    this.uuid = uuid;
    this.permit = permit;
    this.value = value;
    this.handle = null;
}

module.exports = Central;