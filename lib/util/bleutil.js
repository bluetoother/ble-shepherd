var Q = require('q'),
	_ = require('lodash');

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

module.exports = bleutil;