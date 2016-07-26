/*jslint node: true */
'use strict';

var _ = require('busyman'),
	Q = require('q'),
	ccbnp = require('cc-bnp');

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
        serv.startHdl = hdlBuf.readUInt16LE(0);
        serv.endHdl = hdlBuf.readUInt16BE(1);
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

Central.prototype.delServ = function (hdl, callback) {
    var self = this,
        deferred = Q.defer();

    if (!_.isNumber(hdl)) {
        deferred.reject(new TypeError('hdl must be a number'));
    } else {
        ccbnp.gatt.delService(hdl).then(function (result) {
            _.forEach(self.servs, function (serv) {
                if (serv.startHdl === hdl) { self.servs.splice(_.indexOf(self.servs, serv), 1); }
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
        reqConnHdl = attMsg.data.connHandle,
        reqStartHdl = attMsg.data.startHandle,
        reqEndHdl = attMsg.data.endHandle,
        reqHdl = attMsg.data.handle,
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
            ccbnp.att.errorRsp(reqConnHdl, 0x02, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttFindInfoReq':
            attrs = _.filter(attrs, function (attr) {
                return  (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
            });
            attrs = _.sortBy(attrs, ['hdl']);
            _.forEach(attrs, function (attr, i) {
                rspObj['handle' + i] = attr.hdl;
                rspObj['uuid' + i] = attr.uuid;
            });
            ccbnp.att.findInfoRsp(reqConnHdl, 1, rspObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
            break;
        case 'AttFindByTypeValueReq': 
            if (reqUuid === '0x2800') {
                reqVal = bleutil.buf2Str(attMsg.data.value);
                _.forEach(this.servs, function (serv) {
                    if (serv.uuid === reqVal && (serv.startHdl >= reqStartHdl) && (serv.endHdl <= reqEndHdl)) {
                        rspObj.attrHandle0 = serv.startHdl;
                        rspObj.grpEndHandle0 = serv.endHdl;
                    }
                });
                if (_.isEmpty(rspObj)) { 
                    ccbnp.att.errorRsp(reqConnHdl, 0x06, 0x0001, 0x0A);
                    deferred.resolve();
                } else {
                    ccbnp.att.findByTypeValueRsp(reqConnHdl, rspObj, reqUuid).then(function () {
                        deferred.resolve();
                    }).fail(function (err) {
                        deferred.reject(err);
                    }).done();
                }
            } else {
                ccbnp.att.errorRsp(reqConnHdl, 0x06, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            } 
            break;
        case 'AttReadByTypeReq': 
            if (!GATTDEFS.CharUuid.get(_.parseInt(reqUuid, 16))) {
                ccbnp.att.errorRsp(reqConnHdl, 0x08, 1, 14);
                deferred.reject(new Error('Characteristic: ' + reqUuid + ' not register.'));
            } else {
                attrs = _.filter(attrs, function (attr) {
                    return (attr.uuid === reqUuid) && (attr.hdl >= reqStartHdl) && (attr.hdl <= reqEndHdl);
                });
                attrs = _.sortBy(attrs, ['hdl']);
                _.forEach(attrs, function (attr, i) {
                    rspObj['attrHandle' + i] = attr.hdl;
                    rspObj['attrVal' + i] = attr.val;
                });
                ccbnp.att.readByTypeRsp(reqConnHdl, _.size(rspObj), rspObj , reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadReq': 
            attr = _.find(attrs, {hdl: reqHdl});
            if (!GATTDEFS.CharUuid.get(_.parseInt(attr.uuid, 16))) {
                ccbnp.att.errorRsp(reqConnHdl, 0x0a, reqHdl, 14);
                deferred.reject(new Error('Characteristic: ' + attr.uuid + ' not register.'));
            } else {
                ccbnp.att.readRsp(reqConnHdl, attr.val, attr.uuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        case 'AttReadBlobReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x0c, reqHdl, 0x0B);
            deferred.resolve();
            break;
        case 'AttReadMultiReq': //TODO, uuid not register, 0x0e
            reqHdl = _.values(attMsg.data);
            _.forEach(attrs, function (attr) {
                _.forEach(reqHdl, function (hdl, i) {
                    if (attr.hdl === hdl) {
                        rspObj[attr.hdl] = attr.val;
                        uuidObj['uuid' + i] = attr.uuid;
                    }
                });
            });
            ccbnp.att.readMultiRsp(reqConnHdl, rspObj, uuidObj).then(function () {
                deferred.resolve();
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
            break;
        case 'AttReadByGrpTypeReq':
            if (reqUuid === '0x2800') {
                servs = _.filter(this.servs, function (serv) {
                    return (serv.startHdl >= reqStartHdl) && (serv.endHdl <= reqEndHdl);
                });

                _.forEach(servs, function (serv, i) {
                    rspObj['attrHandle' + i] = serv.startHdl;
                    rspObj['endGroupHandle' + i] = serv.endHdl;
                    rspObj['attrVal' + i] = bleutil.str2Buf(serv.uuid);
                });
                ccbnp.att.readByGrpTypeRsp(reqConnHdl, 6, rspObj, reqUuid).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            } else {
                ccbnp.att.errorRsp(reqConnHdl, 0x10, 1, 1);
                deferred.reject(new Error('Unable to handle this command with uuid: ' + reqUuid));
            }
            break;
        case 'AttWriteReq': 
            attr = _.find(attrs, {hdl: reqHdl});
            attr.val = attMsg.data.value;

            _.forEach(this.servs, function (serv) {
                var result;
                result = serv.findChar(attr.hdl);
                if (result) { char = result; }
            });

            if (!char) {
                deferred.reject('Can not find Characteristic');
            } else {
                if (attr.uuid === '0x2902') {
                    if (attr.val === 0x0001) { char.onIndMessage('notif'); }
                    if (attr.val === 0x0002) { char.onIndMessage('ind'); }
                } else {
                    char.onMessage(attr.uuid, attMsg.data);
                }
                
                ccbnp.att.writeRsp(reqConnHdl).then(function () {
                    deferred.resolve();
                }).fail(function (err) {
                    deferred.reject(err);
                }).done();
            }
            break;
        //TODO
        case 'AttPrepareWriteReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x16, 1, 1);
            deferred.reject(new Error('Unable to handle this command.'));
            break;
        case 'AttExecuteWriteReq':
            ccbnp.att.errorRsp(reqConnHdl, 0x18, 1, 1);
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
    this.startHdl = null;
    this.endHdl = null;
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
        startHdl = this.startHdl;

    _.forEach(attrs, function (attr) {
        startHdl += 1;
        attr.hdl = startHdl;
        if (attr.uuid === '0x2803') {
            attr.val.hdl = attr.hdl + 1;
        }
    });

    if (startHdl !== this.endHdl) {
        return new Error('An error occurred when assigning handles');
    }
};

Service.prototype.expUuidHdlTable = function () {
    var uuidHdlTable = {};

    _.forEach(this.chars, function (char, name) {
        _.forEach(char.attrs, function (attr) {
            if (attr.uuid === name) {
                uuidHdlTable[attr.hdl] = attr.uuid;
            }
        });
    });

    return uuidHdlTable;
};

Service.prototype.findChar = function (hdl) {
    var result;

    if (!_.isNumber(hdl)) { throw new TypeError('Argument of addChars() must be a number.'); }
    _.forEach(this.chars, function (char) {
        _.forEach(char.attrs, function (attr) {
            if (attr.hdl === hdl) { result = char; }
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
        hdl: null
    };
	this.attrs.push(new Attribute('0x2803', ['Read'], charVal));
	this.attrs.push(new Attribute(charInfo.uuid, charInfo.permit, charInfo.val));
    this.attrs[0].val.hdl = this.attrs[1].hdl;

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
function Attribute (uuid, permit, val) {
    this.uuid = uuid;
    this.permit = permit;
    this.val = val;
    this.hdl = null;
}

module.exports = Central;