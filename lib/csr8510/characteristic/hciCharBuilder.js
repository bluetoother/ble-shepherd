'use strict';

var Q = require('q'),
    _ = require('lodash'),
    Concentrate = require('concentrate'),
    hciCharMeta = require('./hciCharMeta');

var nibbleBuf = [];

function hciCharBuilder (uuid) {
    return ValObj.factory(uuid);
}

/***************************************************************************************************/
/*** ValObj Class                                                                                ***/
/***************************************************************************************************/
function ValObj() {}

ValObj.factory = function (uuid) {
    var charValsMeta;

    charValsMeta = hciCharMeta[uuid];

    ValObj[uuid] = function () {
        this.UUID = uuid;
        ValObj[uuid].charVals = ValObj[uuid].charVals || charValsMeta;
    };

    if (!_.isFunction(ValObj[uuid].prototype.getCharVals)) {
        ValObj[uuid].prototype = new ValObj();
    }

    return new ValObj[uuid]();
};

ValObj.prototype.getCharVals = function () {
    return this.constructor[this.UUID].charVals;
};

ValObj.prototype.transToValObj = function (argInst) {
    var self = this,
        charVals,
        cmdExtraParams,
        param,
        extJudge;

    charVals = this.getCharVals();

    if (argInst instanceof ValObj[this.UUID]) { return argInst; }

    _.forEach(charVals.params, function (param) {
        if (!argInst.hasOwnProperty(param)) { throw new Error('The argument object has incorrect properties.'); }
        self[param] = argInst[param];
    });

    if (charVals.extra) {
        if (argInst.hasOwnProperty('flags')) {
            extJudge = function(i) { return ((argInst.flags & charVals.extra.flags[i]) === charVals.extra.result[i]); };
        } else if (argInst.hasOwnProperty('condition')) {
            // handle 0x290a 0x290e
            extJudge = function(i) { 
                if (self.UUID === '0x290a' && argInst.condition === 0) return false;
                else return (argInst.condition <= charVals.extra.result[i]); };
        } else if (argInst.hasOwnProperty('opCode')) {
            // TODO handle variable
            extJudge = function(i) { return (argInst.OpCode === charVals.extra.result[i]); };
        }

        for(var i = 0; i < _.size(charVals.extra.params); i += 1) {
            if (extJudge(i)) {
                param = charVals.extra.params[i];
                if (!argInst.hasOwnProperty(param)) { throw new Error('The argument object has incorrect properties.'); }
                self[param] = argInst[param];
                
                if (argInst.hasOwnProperty('condition')) break;
            }
        }
    }
    return this;
};

ValObj.prototype.getHciCharBuf = function (callback) {
    var self = this,
        dataBuf = Concentrate(),
        charVals;

    charVals = this.getCharVals();

    _.forEach(charVals.params, function (param, idx) {
        var paramVal = self[param],
            paramType = charVals.types[idx];

        // checkType(paramVal, paramType, param);
        builder(dataBuf, paramVal, paramType, charVals);
    });

    if (charVals.extra) {
        if (this.hasOwnProperty('flags') || this.hasOwnProperty('condition') || this.hasOwnProperty('opCode')) {
            _.forEach(charVals.extra.params, function (param, idx) {
                if (self.hasOwnProperty(param)) builder(dataBuf, self[param], charVals.extra.types[idx], charVals);
            });
        }
    }
 
    return dataBuf.result();
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function builder(dataBuf, paramVal, paramType, charVals) {
    var tmpBuf,
        result,
        sgn,
        mantissa,
        exponent,
        smantissa,
        rmantissa,
        mdiff,
        int_mantissa;

    switch (paramType) {
        case 'int8' :
        case 'int16' :
        case 'int32' :
        case 'uint8':
        case 'uint16':
        case 'uint32':
            dataBuf = dataBuf[paramType](paramVal);
            break;
        case 'uint24':
            tmpBuf = paramVal & 0xFFFF; 
            dataBuf = dataBuf.uint16(tmpBuf);
            tmpBuf = paramVal >> 16;
            dataBuf = dataBuf.uint8(tmpBuf);
            break;
        case 'int24':
            tmpBuf = paramVal & 0xFFFF; 
            dataBuf = dataBuf.uint16(tmpBuf);
            tmpBuf = paramVal >> 16 & 0xFF;
            dataBuf = dataBuf.uint8(tmpBuf);
            break;
        case 'string':
            dataBuf = dataBuf.string(paramVal, "utf8");
            break;
        case 'uuid':
        case 'addr3':
        case 'addr5':
        case 'addr6':
            paramVal = str2Buf(paramVal);
            dataBuf = dataBuf.buffer(paramVal);
            break;
        case 'boolean':
            dataBuf = dataBuf.uint8(paramVal);
            break;
        case 'list':
            dataBuf = generateListBuf(dataBuf, paramVal, charVals.objInfo);
            break;
        case 'nibble': 
            nibbleBuf.push(paramVal);
            if (nibbleBuf.length === 2) {
                dataBuf = dataBuf.uint8(nibbleBuf[0] + (nibbleBuf[1] << 4));
                nibbleBuf = [];
            }
            break;
        case 'sfloat':
            result = 0x07FF;
            sgn = paramVal > 0 ? +1 : -1;
            mantissa = Math.abs(paramVal);
            exponent = 0;

            if (isNaN(paramVal)) {
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (paramVal > 20450000000.0) {
                result = 0x07FE;
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (paramVal < -20450000000.0) {
                result = 0x0802;
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (paramVal >= -1e-8 && paramVal <= 1e-8) {
                result = 0;
                dataBuf = dataBuf.uint16(result);
                break;
            }

            // scale up if number is too big
            while (mantissa > 0x07FD) {
                mantissa /= 10.0;
                ++exponent;
                if (exponent > 7) {
                    // argh, should not happen
                    if (sgn > 0) {
                        result = 0x07FE;
                    } else {
                        result = 0x0802;
                    }
                    dataBuf = dataBuf.uint16(result);
                    break;
                }
            }

            // scale down if number is too small
            while (mantissa < 1) {
                mantissa *= 10;
                --exponent;
                if (exponent < -8) {
                    // argh, should not happen
                    result = 0;
                    dataBuf = dataBuf.uint16(result);
                    break;
                }
            }

            smantissa = Math.round(mantissa * 10000);
            rmantissa = Math.round(mantissa) * 10000;
            mdiff = Math.abs(smantissa - rmantissa);

            while (mdiff > 0.5 && exponent > -8 && (mantissa * 10) <= 0x07FD) {
                mantissa *= 10;
                --exponent;
                smantissa = Math.round(mantissa * 10000);
                rmantissa = Math.round(mantissa) * 10000;
                mdiff = Math.abs(smantissa - rmantissa);
            }
            int_mantissa = parseInt(Math.round(sgn * mantissa));
            result = ((exponent & 0xF) << 12) | (int_mantissa & 0xFFF);
            dataBuf = dataBuf.uint16(result);
            break;
        case 'float':
            result = 0x007FFFFF;
            sgn = paramVal > 0 ? +1 : -1;
            mantissa = Math.abs(paramVal);
            exponent = 0;

            if (isNaN(paramVal)) {
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (paramVal > 8.388604999999999e+133) {
                result = 0x007FFFFE;
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (paramVal < -(8.388604999999999e+133)) {
                result = 0x00800002;
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (paramVal >= -(1e-128) && paramVal <= 1e-128) {
                result = 0;
                dataBuf = dataBuf.uint32(result);
                break;
            }

            // scale up if number is too big
            while (mantissa > 0x007FFFFD) {
                mantissa /= 10.0;
                ++exponent;
                if (exponent > 127) {
                    // argh, should not happen
                    if (sgn > 0) {
                        result = 0x007FFFFE;
                    } else {
                        result = 0x00800002;
                    }
                    dataBuf = dataBuf.uint32(result);
                    break;
                }
            }

            // scale down if number is too small
            while (mantissa < 1) {
                mantissa *= 10;
                --exponent;
                if (exponent < -128) {
                    // argh, should not happen
                    result = 0;
                    dataBuf = dataBuf.uint32(result);
                    break;
                }
            }

            // scale down if number needs more precision
            smantissa = Math.round(mantissa * 10000000);
            rmantissa = Math.round(mantissa) * 10000000;
            mdiff = Math.abs(smantissa - rmantissa);
            while (mdiff > 0.5 && exponent > -128 && (mantissa * 10) <= 0x007FFFFD) {
                mantissa *= 10;
                --exponent;
                smantissa = Math.round(mantissa * 10000000);
                rmantissa = Math.round(mantissa) * 10000000;
                mdiff = Math.abs(smantissa - rmantissa);
            }

            int_mantissa = parseInt(Math.round(sgn * mantissa));
            result = ((exponent & 0xFF) << 24) | (int_mantissa & 0xFFFFFF);
            dataBuf = dataBuf.int32(result);
            break;
        case 'variable': 
            dataBuf = dataBuf.buffer(paramVal);
            break;
        default:
            throw new Error("Unknown Data Type");
    }

    return dataBuf;
}
function generateListBuf(dataBuf, listVal, objInfo) {
    _.forEach(listVal, function (val) {
        dataBuf = dataBuf[objInfo.types[0]](val);
    });

    return dataBuf;
}

function checkType(data, type, param) {
    var typeObj = {
        uint8: 255,
        uint16be: 65535,
        uint16le: 65535,
        uint32le: 4294967295,
        buffer: 255,
        buffer8: 8,
        buffer16: 16
    };

    switch (type) {
        case 'uint8':
        case 'uint16':
        case 'uint32':
            if (!(_.isNumber(data)) || (data < 0) || (data > typeObj[type])) { 
                throw new Error(param + ' must be an integer from 0 to ' + typeObj[type] + '.'); 
            }
            break;

        case 'uuid':
        case 'addr':
        case 'string':
            if (!_.isString(data)) {
                throw new Error(param + ' must be a string.');
            }
            break;
        case 'obj':
            if (!_.isObject(data)) {
                throw new Error(param + ' must be a object.');
            }
            break;

        default:
            throw new Error("Unknown Data Type");
    }
}

function str2Buf (str) {
    var bufLen,
        val,
        chunk,
        tmpBuf;

    if (_.startsWith(str, '0x')) { str = str.slice(2); }
    bufLen = str.length / 2;
    tmpBuf = (new Buffer(bufLen)).fill(0);
    for (var i = 0; i < bufLen; i += 1) {
        chunk = str.substring(0, 2);
        val = _.parseInt(chunk, 16);
        str = str.slice(2);
        tmpBuf.writeUInt8(val, (bufLen-i-1));
    }

    return tmpBuf;
}

module.exports = hciCharBuilder;
