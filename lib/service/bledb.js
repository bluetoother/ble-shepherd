var Datastore = require('nedb'),
    Q = require('q'),
    _ = require('lodash');

var db = new Datastore({ filename: '../lib/ble.db', autoload: true });

var bledb = {};

bledb.saveDevInfo  = function (devInfo, callback) {
    var self = this;
        deferred = Q.defer();

    this.hasInDB({_id: devInfo._id}).then(function (result) {
        if (!result) {
            db.insert(devInfo, function (err, doc) {
                if (!err) {
                    deferred.resolve(doc);
                } else {
                    deferred.reject(err);
                }
            });
        } else {
            //TODO
            // self.update();
            deferred.resolve(devInfo);
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
    return deferred.promise.nodeify(callback);
};

bledb.saveServInfo = function (servInfo, callback) {
    var self = this;
        deferred = Q.defer();

    this.hasInDB({owner: servInfo.owner, uuid: servInfo.uuid}).then(function (result) {
        if (!result) {
            db.insert(servInfo, function (err, doc) {
                if (!err) {
                    deferred.resolve(doc);
                } else {
                    deferred.reject(err);
                }
            });
        } else {
            //TODO
            // self.update();
            deferred.resolve(servInfo);
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
    return deferred.promise.nodeify(callback);
};

bledb.saveCharInfo = function (charInfo, callback) {
    var self = this;
        deferred = Q.defer();

    this.hasInDB({ancestor: charInfo.ancestor, uuid: charInfo.uuid}).then(function (result) {
        if (!result) {
            db.insert(charInfo, function (err, doc) {
                if (!err) {
                    deferred.resolve(doc);
                } else {
                    deferred.reject(err);
                }
            });
        } else {
            //TODO
            // self.update();
            deferred.resolve(charInfo);
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
    return deferred.promise.nodeify(callback);
};

bledb.getInfo = function (type, callback) {
    var deferred = Q.defer(),
        queryObj,
        sortObj;

    if (type === 'device') {
        queryObj = {role: 'peripheral'};
        sortObj = {_id: 1};
    } else if (type === 'service') {
        queryObj = {owner: {$exists: true}, ancestor: {$exists: false}};
        sortObj = {uuid: 1};
    } else if (type === 'characteristic') {
        queryObj = {owner: {$exists: true}, ancestor: {$exists: true}};
        sortObj = {uuid: 1};
    } else {
        deferred.reject('type must be device or service or characteristic');
    }

    db.find(queryObj).sort(sortObj).exec(function (err, docs) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(docs);
        }
    });

    return deferred.promise.nodeify(callback);
};

bledb.update = function (id, updateObj, callback) {
    var deferred = Q.defer();

    db.update({ _id: id }, { $set: updateObj }, { multi: true }, function (err, numReplaced) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(numReplaced);
        }
    });
    return deferred.promise.nodeify(callback);
};

bledb.hasInDB = function (query, callback) { //TODO, public or private
    var deferred = Q.defer();

    db.findOne(query, function (err, doc) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(doc);
        }
    });

    return deferred.promise.nodeify(callback);
};

bledb.remove = function (type, id, callback) {
    var deferred = Q.defer(),
        rmvObj = {};

    if (type === 'device') {
        rmvObj['_id'] = id;
    } else if (type === 'service') {
        rmvObj['owner'] = id;
    } else if (type === 'characteristic') {
        rmvObj['ancestor'] = id;
    }

    db.remove(rmvObj, {multi: true}, function (err, numRemoved) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(numRemoved);
        }
    });

    return deferred.promise.nodeify(callback);
};

module.exports = bledb;