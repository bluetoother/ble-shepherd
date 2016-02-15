var Datastore = require('nedb'),
    Q = require('q'),
    _ = require('lodash');

var db = new Datastore({ filename: (__dirname + '/database/ble.db'), autoload: true });

var nobledb = {};

nobledb.saveInfo = function (type, obj) {
    var deferred = Q.defer(),
        self = this,
        saveObj,
        checkObj = gerOperInfo(type, obj);

    if (type === 'peripheral') { saveObj = new Peripheral(obj); } 
    if (type === 'service') { saveObj = new Service(obj); } 
    if (type === 'characteristic') { saveObj = new Characteristic(obj); }

    this.hasInDB(checkObj).then(function (result) {
        if (!result) {
            db.insert(saveObj, function (err, doc) {
                if (!err) {
                    deferred.resolve(doc);
                } else {
                    deferred.reject(err);
                }
            });
        } else {
            self.update(type, saveObj).then(function () {
                return self.hasInDB(checkObj);
            }).then(function (updatedObj) {
                deferred.resolve(updatedObj);
            }).fail(function (err) {
                deferred.reject(err);
            }).done();
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
};

nobledb.getInfo = function (type) {
    var deferred = Q.defer(),
        queryObj,
        sortObj;

    if (type === 'peripheral') {
        queryObj = {id: {$exists: true}};
        sortObj = {id: 1};
    } else if (type === 'service') {
        queryObj = {owner: {$exists: true}, ancestor: {$exists: false}};
        sortObj = {uuid: 1};
    } else if (type === 'characteristic') {
        queryObj = {owner: {$exists: true}, ancestor: {$exists: true}};
        sortObj = {uuid: 1};
    } else {
        deferred.reject(new Error('type must be peripheral or service or characteristic'));
    }

    db.find(queryObj).sort(sortObj).exec(function (err, docs) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(docs);
        }
    });

    return deferred.promise;
};

nobledb.update = function (type, obj) {
    var deferred = Q.defer(),
        updateObj,
        checkObj = gerOperInfo(type, obj),
        diffObj = {};

    if (type === 'peripheral') { updateObj = new Peripheral(obj); }
    if (type === 'service') { updateObj = new Service(obj); }
    if (type === 'characteristic') { updateObj = new Characteristic(obj); }

    this.hasInDB(checkObj).then(function (result) {
        if (!result) { 
            deferred.reject(new Error('No such object ' + JSON.stringify(checkObj) + ' for property update.')); 
        } else {
            _.forEach(updateObj, function (val, key) {
                if (!_.isUndefined(result[key]) && !_.isEqual(result[key], updateObj[key])) {
                    diffObj[key] = val;
                }
            });

            if (_.size(diffObj) === 0) {
                deferred.resolve(0);
            } else {
                db.update(checkObj, { $set: diffObj }, { multi: true }, function (err, numReplaced) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(numReplaced);
                    }
                });
            }
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();
    
    return deferred.promise;
};

nobledb.remove = function (type, rmvObj) {
    var deferred = Q.defer();
        rmvObjInfo = gerOperInfo(type, rmvObj);

    if (type === 'peripheral') {
        return removeById(rmvObjInfo).then(function () {
            return removeById({owner: rmvObj.id});
        }).then(function () {
            return removeById({ancestor: rmvObj.id});
        });
    } else if (type === 'service') {
        return removeById(rmvObjInfo).then(function () {
            return removeById({ancestor: rmvObj._peripheralId, owner: rmvObj.uuid});
        });
    } else if (type === 'characteristic') {
        return removeById(rmvObjInfo);
    }

    return deferred.promise;
};

nobledb.hasInDB = function (query) { 
    var deferred = Q.defer();

    db.findOne(query, function (err, doc) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(doc);
        }
    });

    return deferred.promise;
};

function removeById (query) {
    var deferred = Q.defer();

    db.remove(query, {multi: true}, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function gerOperInfo (type, operObj) {
    var result = {};

    if (type === 'peripheral') {
        result.id = operObj.id;
    } else if (type === 'service') {
        result.owner = operObj._peripheralId || operObj.owner;
        result.uuid = operObj.uuid;
    } else if (type === 'characteristic') {
        result.ancestor = operObj._peripheralId || operObj.ancestor;
        result.owner = operObj._serviceUuid || operObj.owner;
        result.uuid = operObj.uuid;
    }

    return result;
}


function Peripheral (peripheral) {
    this.id = peripheral.id;
    this.address = peripheral.address;
    this.addressType = peripheral.addressType;
    this.advertisement = peripheral.advertisement;
    this.rssi = peripheral.rssi;
    this.services = _.map(peripheral.services, function (serv) {
        return serv.uuid;
    });
}

function Service (service) {
    this.owner = service._peripheralId;
    this.uuid = service.uuid;
    this.chars = _.map(service.characteristics, function (characteristic) {
        return characteristic.uuid;
    });
}

function Characteristic (characteristic) {
    this.ancestor = characteristic._peripheralId;
    this.owner = characteristic._serviceUuid;
    this.uuid = characteristic.uuid;
    this.properties = characteristic.properties;
    this.value = characteristic.value || null;
}

module.exports = nobledb;