'use strict';

var Q = require('q'),
    _ = require('lodash'),
    Enum = require('enum'),
    DChunks = require('dissolve-chunks'),
    ru = DChunks().Rule(),
    util = require('util');

var charMeta = require('./HciCharMeta');

function hciCharDiscriminator (uuid) {
    return ValObj.factory(uuid);
}

function ValObj() {
}

ValObj.factory = function (uuid) {
    var charValsMeta;

    if (_.isObject(uuid)) {
        ValObj.multi = function () {
            this.uuid = uuid;
        };

        if (!_.isFunction(ValObj.multi.prototype.getCharValPacket)) {
            ValObj.multi.prototype = new ValObj();
        }

        return new ValObj.multi();
    } else {
        charValsMeta = charMeta[uuid];

        if (!charValsMeta) {
            ValObj[uuid] = function () {};
        } else {
            ValObj[uuid] = function () {
                this.uuid = uuid;
                ValObj[uuid].charVals = ValObj[uuid].charVals || charValsMeta;
            };
        }

        if (!_.isFunction(ValObj[uuid].prototype.getCharVals)) {
            ValObj[uuid].prototype = new ValObj();
        }

        return new ValObj[uuid]();
    }
};

ValObj.prototype.getCharVals = function () {
    return this.constructor[this.uuid].charVals;
};

ValObj.prototype.getCharValParser = function (bBuf, uuid) {
    var self = this,
        charVals,
        chunkRules = [],
        extChunkRules = [],
        nibbleBuf = [];

    if (uuid) {
        charVals = charMeta[uuid];
    } else {
        charVals = this.getCharVals();
    }

    _.forEach(charVals.params, function (param, idx) {
        var valType = charVals.types[idx];

        if ( valType === 'string' ) {
            if (self.uuid === '0x2a46') chunkRules.push(ru.string(param, bBuf.length - 2));
            else chunkRules.push(ru.string(param, bBuf.length));
        } else if (_.startsWith(valType, 'addr')) {
            chunkRules.push(ru['charAddr'](param, _.parseInt(valType.slice(4))));
        } else if ( valType === 'nibble') {
            nibbleBuf.push(param);
            if (nibbleBuf.length === 2) {
                chunkRules.push(ru[valType](nibbleBuf[0], nibbleBuf[1]));
            }
        } else if ( valType === 'uuid' ) {
            if (self.uuid === '0x2802') {
                chunkRules.push(ru['uuid'](param, bBuf.length - 4));
            } else if (self.uuid === '0x2803') {
                chunkRules.push(ru['uuid'](param, bBuf.length - 3));
            } else if (self.uuid === '0x2a7d') {
                chunkRules.push(ru['uuid'](param, bBuf.length - 2));
            } else {
                chunkRules.push(ru['uuid'](param, bBuf.length));
            }
        } else if ( valType === 'obj' ) {
            chunkRules.push(ru['obj'](param, charVals.objInfo, bBuf.length));
        } else {
            chunkRules.push(ru[valType](param));
        }
    });

    if (charVals.extra) {
        extChunkRules = buildExtraCharValsRules(this, uuid);
        chunkRules.push(extChunkRules[0]);
    }

    return chunkRules;
};

ValObj.prototype.getCharValPacket = function (bBuf, callback) {
    var self = this,
        deferred = Q.defer(),
        rules = [],
        parser,
        bufLen;

    if (!this.uuid) {
        deferred.resolve(bBuf);
    } else if (_.isObject(this.uuid)) {
        _.forEach(this.uuid, function (uuid, key) {
            rules.push(ru.squash(key, self.getCharValParser(bBuf, uuid)));
        });
        parser = DChunks().join(rules).compile();
        parser.on('parsed', function (result) {
            parser = undefined;
            deferred.resolve(result);
        });
        parser.write(bBuf);
    } else {
        bufLen = charMeta[this.uuid].bufLen;
        if (bufLen && bBuf.length !== bufLen) {
            deferred.resolve(bBuf);
        } else if (_.isArray(bufLen) && !_.includes(bufLen, bBuf.length)) {
            deferred.resolve(bBuf);
        } else {
            rules = this.getCharValParser(bBuf); 
            parser = DChunks().join(rules).compile();
            parser.on('parsed', function (result) {
                parser = undefined;
                deferred.resolve(result);
            });
            parser.write(bBuf);
        }
    }



    return deferred.promise.nodeify(callback);
};
/*************************************************************************************************/
/*** Specific Chunk Rules                                                                      ***/
/*************************************************************************************************/
ru.clause('boolean', function (name) {
    this.uint8('bool').tap(function () {
        if (!this.vars.bool) this.vars[name] = false;
        else this.vars[name] = true; 
        delete this.vars.bool;
    });   
});

ru.clause('uint24', function (name) {
    this.uint8('lsb').tap(function () {
        this.uint16('msb').tap(function () {
            var value;
            value = (this.vars.msb * 256) + this.vars.lsb;
            this.vars[name] = value;
            delete this.vars.lsb;
            delete this.vars.msb;
        });
    });  
});     

ru.clause('int24', function (name) {
    this.uint8('lsb').tap(function () {
        this.uint16('msb').tap(function () {
            var value,
                sign = (this.vars.msb & 0x8000) >> 15;
            value = ((this.vars.msb & 0x7FFF) * 256) + this.vars.lsb;
            if (sign) this.vars[name] = -(0x7FFFFF - value + 1);
            else this.vars[name] = value;
            delete this.vars.lsb;
            delete this.vars.msb;
        });
    });  
});     

ru.clause('charAddr', function (name, valLen) {
    this.buffer(name, valLen).tap(function () {
        var addr,
            origBuf = this.vars[name];

        addr = buf2Str(origBuf);
        this.vars[name] = addr;
    });
});

ru.clause('uuid', function (name, bufLen) {
    if (!bufLen) { bufLen = 2; }
    this.buffer(name, bufLen).tap(function () {
        var uuid,
            origBuf = this.vars[name];

        uuid = buf2Str(origBuf);
        this.vars[name] = uuid;
    });
});

ru.clause('sfloat', function (valName) {
    this.uint16('sfloat').tap(function () {
        this.vars[valName] = uint2sfloat(this.vars.sfloat);
        delete this.vars.sfloat;
    });
});

ru.clause('float', function (valName) {
    this.uint32('float').tap(function () {
        this.vars[valName] = uint2float(this.vars.float);
        delete this.vars.float;
    });
});

ru.clause('nibble', function (valLsbName, valMsbName) {
    this.uint8('temp').tap(function () {
        this.vars[valLsbName] = this.vars.temp & 0x0F;
        this.vars[valMsbName] = (this.vars.temp & 0xF0)/16;
        delete this.vars.temp;
    });
});

ru.clause('obj', function (objName, objAttrs, buflen) {
    var loopTimes = Math.floor(buflen / objAttrs.objLen);

    this.tap(objName, function () {
        var self = this;

        for (var i = 0; i < loopTimes; i += 1) {
            _.forEach(objAttrs.params, function(param, idx) {
                var type = objAttrs.types[idx];
                self[type](param + i);
            });
        }
    }).tap(function () {
        for (var k in this.vars) {
            delete this.vars[k].__proto__;
        }
    });
});

ru.clause('0x290a', function (extParams, extTypes) {
    this.tap(function () {
        if ((this.vars.condition > 0) && (this.vars.condition <= 3)) {
            this[extTypes[0]](extParams[0]);
        } else if (this.vars.condition === 4) {
            this[extTypes[1]](extParams[1]);
        } else if ((this.vars.condition > 4) && (this.vars.condition <= 6)) {
            this[extTypes[2]](extParams[2]);
        }
    });
});

ru.clause('0x290e', function (extParams, extTypes) {
    this.tap(function () {
        if (this.vars.condition === 0) {
            this[extTypes[0]](extParams[0]);
        } else if ((this.vars.condition > 0) && (this.vars.condition <= 2)) {
            ru[extTypes[1]](extParams[1])(this);
        } else if (this.vars.condition === 3) {
            this[extTypes[2]](extParams[2]);
        }
    });
});

var uintRules = [
  'int8', 'sint8', 'uint8',
  'int16', 'int16le', 'int16be', 'sint16', 'sint16le', 'sint16be', 'uint16', 'uint16le', 'uint16be',
  'int32', 'int32le', 'int32be', 'sint32', 'sint32le', 'sint32be', 'uint32', 'uint32le', 'uint32be',
  'int64', 'int64le', 'int64be', 'sint64', 'sint64le', 'sint64be', 'uint64', 'uint64le', 'uint64be',
  'floatbe', 'floatle', 'doublebe', 'doublele'
];

ru.clause('valsRules', function (extParams, extTypes, extFlags, extResult, extValLen) {
    this.tap(function () {
        for (var i = 0; i < extValLen; i++) {
            if ((this.vars.flags & extFlags[i]) === extResult[i]) {
                if(_.indexOf(uintRules, extTypes[i]) > 0) {
                    this[extTypes[i]](extParams[i]);
                } else if (extTypes[i] === 'nibble') {
                    ru.nibble(extParams[i], extParams[i + 1])(this);
                    i += 1; 
                }else {
                    ru[extTypes[i]](extParams[i])(this);
                }
            }   
        }
    });
});

ru.clause('variable', function (extParams, extTypes, extResult, extValLen) {
    this.tap(function () {
        var offest = 0;
        for (var i = 0; i < extValLen; i++) {
            if (this.vars.OpCode === extResult[i]) {
                    if (extTypes[i] === 'string') {
                        ru.string(extParams[i], this._buffer.length - 1 - offest)(this);
                    } else {
                        ru[extTypes[i]](extParams[i])(this);
                    }

                    switch (extTypes[i]) {
                        case 'uint8':
                            offest += 1;
                            break;

                        default:
                            break;
                    }
            }   
        }
    });
});
/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function buildExtraCharValsRules (valObj, uuid) {
    var extraRules = [],
        charUuid, 
        charVals,
        extParams,
        extTypes,
        extFlags,
        extResult,
        extValLen;

    if(uuid) {
        charUuid = uuid;
        charVals = charMeta[uuid].extra;
    } else {
        charUuid = valObj.uuid;
        charVals = valObj.getCharVals().extra;
    }

    extParams = charVals.params;
    extTypes = charVals.types;
    extFlags = charVals.flags;
    extResult = charVals.result;
    extValLen = charVals.params.length;

    switch (charUuid) {
        case '0x290a':
            extraRules.push(ru['0x290a'](extParams, extTypes));
            break;
        case '0x290e':
            extraRules.push(ru['0x290e'](extParams, extTypes));
            break;
        case '0x290d':
            //TODO variable
        case '0x2a2a':
            //TODO reg-cert-data-list
            break;
        case '0x2a55':
            // extraRules.push(ru['variable'](extParams, extTypes, extResult, extValLen));
            // break;
        case '0x2a63':
            //TODO Optional
        case '0x2a64':
            //TODO Optional
        case '0x2a66':
            //TODO variable
        case '0x2a6b':
            //TODO Optional
        case '0x2a9f':
            //TODO variable
        case '0x2aa4':
            //TODO variable
        case '0x2aa7':
            //TODO variable
        case '0x2aa9':
            //TODO E2E-CRC
        case '0x2aaa':
            //TODO E2E-CRC
        case '0x2aab':
            //TODO E2E-CRC
        case '0x2aac':
            //TODO E2E-CRC
            break;
        default:
            extraRules.push(ru['valsRules'](extParams, extTypes, extFlags, extResult, extValLen));
            break;
    }

    return extraRules;
}

function buf2Str(buf) {
    var bufLen = buf.length,
        val,
        strChunk = '0x';

    for (var i = 0; i < bufLen; i += 1) {
        val = buf.readUInt8(bufLen-i-1);

        if (val <= 15) {
            strChunk += '0' + val.toString(16);
        } else {
            strChunk += val.toString(16);
        }
    }

    return strChunk;
}

function uint2sfloat(ieee11073) {
    var reservedValues = new  Enum({
    0x07FE: 'PositiveInfinity',
    0x07FF: 'NaN',
    0x0800: 'NaN',
    0x0801: 'NaN',
    0x0802: 'NegativeInfinity'
    }),
        mantissa = ieee11073 & 0x0FFF;

    if (reservedValues[mantissa]) return reservedValues[mantissa].value;

    if (mantissa >= 0x0800) mantissa = -(0x1000 - mantissa);

    var exponent = ieee11073 >> 12;

    if (exponent >= 0x08) exponent = -(0x10 - exponent);

    var magnitude = Math.pow(10, exponent);
    return (mantissa * magnitude);  
}

function uint2float(ieee11073) {
    var reservedValues = new  Enum({
    0x007FFFFE: 'PositiveInfinity',
    0x007FFFFF: 'NaN',
    0x00800000: 'NaN',
    0x00800001: 'NaN',
    0x00800002: 'NegativeInfinity'
    }),
        mantissa = ieee11073 & 0x00FFFFFF;

    if (reservedValues[mantissa]) return reservedValues[mantissa].value;
    
    if (mantissa >= 0x800000) mantissa = -(0x1000000 - mantissa);
    
    var exponent = ieee11073 >> 24;

    if (exponent >= 0x10) exponent = -(0x100 - exponent);

    var magnitude = Math.pow(10, exponent);
    return (mantissa * magnitude);  
}

module.exports = hciCharDiscriminator;
