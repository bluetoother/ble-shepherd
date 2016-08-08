var Q = require('q'),
    _ = require('busyman'),
    Enum = require('enum');

var bleutil = {};

bleutil.seqResolveQFuncs = function (qFuncArray) {
    var deferred = Q.defer(),
        i = 0,
        arrLen = qFuncArray.length,
        qFunc,
        resultArr = [];

    var recurFunc = function (qFunc) {
        
        qFunc().then(function (newDoc) {
            resultArr.push(newDoc);
            i += 1;
            if (i < arrLen) {
                qFunc = qFuncArray[i];
                recurFunc(qFunc);
            } else if (i === arrLen) {
                deferred.resolve(resultArr);
            }   
        }, function (err) {
            deferred.reject(err);
        });
    };

    if (arrLen === 0) {
        deferred.resolve([]);
    } else {
        qFunc = qFuncArray[i];
        recurFunc(qFunc);
    }

    return deferred.promise;
};

bleutil.buf2Str = function (buf) {
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
};

bleutil.str2Buf = function (str) {
    var bufLen,
        val,
        chunk,
        tmpBuf;

    if (_.startsWith(str, '0x')) { str = str.slice(2); }
    bufLen = (str.length) / 2;
    tmpBuf = (new Buffer(bufLen)).fill(0);

    for (var i = 0; i < bufLen; i += 1) {
        chunk = str.substring(0, 2);
        val = _.parseInt(chunk, 16);
        str = str.slice(2);
        tmpBuf.writeUInt8(val, (bufLen-i-1));
    }

    return tmpBuf;
};

bleutil.addEnumMember = function (newEnumMem, oldEnum) {
    var enumObj;

    enumObj = oldEnum._enumMap;
    enumObj = _.merge(enumObj, newEnumMem);

    return new Enum(enumObj);
};

bleutil.shrinkUuid = function (uuid) {
    if (uuid.length ===  34) 
        uuid = '0x' + uuid.slice(6, 10);

    if (!_.startsWith(uuid, '0x'))
        uuid = '0x' + uuid;

    return uuid;
};

bleutil.objectDiff = function (oldObj, newObj) {
    var diff = {};

    _.forEach(newObj, function (val, key) {
        if (_.has(oldObj, key) || _.get(oldObj, key) !== val)
            _.set(diff, key, val);
    });

    return diff;
};

module.exports = bleutil;