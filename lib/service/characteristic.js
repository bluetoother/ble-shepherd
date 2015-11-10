'use strict';

var Q = require('q'),
	_ = require('lodash'),
	ccBnp = require('ccbnp');

var BDEFS = require('../defs/bledefs'),
	bledb = require('./bledb'),
	GATTDEFS = require('../defs/gattdefs');

function Characteristic (charInfo) {
	this._id = null;
	this._isSync = false;

	this.ownerServ = null;
	this.uuid = charInfo.uuid;
	this.hdl = charInfo.hdl;
	this.prop = charInfo.prop;
	this.name = null;
	this.val = null;
	this.desc = null;

	if (GATTDEFS.CharUuid.get(this.uuid)) { this.name = GATTDEFS.CharUuid.get(this.uuid).key; }
} 

//TODO LongCherValue
Characteristic.prototype.read = function (callback) {
	var self = this,
		deferred = Q.defer();

	if ((this.prop & GATTDEFS.Prop.Read.value) !== 0) {
		ccBnp.gatt.readCharValue(this.ownerServ.ownerDev.connHdl, this.hdl).then(function (result) {
			self.val = result[1].AttReadRsp.value;
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Characteristic can\'t read'));
	}

	return deferred.promise.nodeify(callback);
};

//TODO LongCherValue
Characteristic.prototype.write = function (value, callback) {
	var self = this,
		deferred = Q.defer(),
		cmd;

	if ((this.prop & GATTDEFS.Prop.Write.value) || (this.prop & GATTDEFS.Prop.WriteNoRsp.value)) {
		if ((this.prop & GATTDEFS.Prop.Write.value)) {
			cmd = 'writeCharValue';
		} else if ((this.prop & GATTDEFS.Prop.WriteNoRsp.value)) {
			cmd = 'writeNoRsp';
		}

		ccBnp.gatt[cmd](this.ownerServ.ownerDev.connHdl, this.hdl, value).then(function () {
			self.val = value;
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Characteristic can\'t write'));
	}

	return deferred.promise.nodeify(callback);
};

//TODO LongCherDesc
Characteristic.prototype.readDesc = function (callback) {
	var self = this,
	deferred = Q.defer();

	if ((this.prop & GATTDEFS.Prop.Read.value)) {
		ccBnp.gatt.readCharDesc(this.ownerServ.ownerDev.connHdl, this.hdl).then(function (result) {
			self.desc = result[1].AttReadRsp.value;
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Descriptor can\'t read'));
	}

	return deferred.promise.nodeify(callback);
};

//TODO LongCherDesc
Characteristic.prototype.writeDesc = function (desc, callback) {
	var self = this,
		deferred = Q.defer();

	if ((this.prop & GATTDEFS.Prop.Write.value)) {
		ccBnp.gatt.writeCharDesc(this.ownerServ.ownerDev.connHdl, this.hdl, desc).then(function () {
			self.desc = desc;
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Descriptor can\'t write'));
	}

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.getConfig = function (callback) {
	var self = this,
		deferred = Q.defer(),
		ownerServ = this.ownerServ,
		val;

	if ((this.prop & GATTDEFS.Prop.Notif.value) || (this.prop & GATTDEFS.Prop.Ind.value)) {
		if ((this.prop & GATTDEFS.Prop.Notif.value)) {
			val = 0;
		} else if ((this.prop & GATTDEFS.Prop.Ind.value)) {
			val = 1;
		}

		ccBnp.gatt.readUsingCharUuid(ownerServ.ownerDev.connHdl, ownerServ.startHdl, ownerServ.endHdl, new Buffer([0x02, 0x29])).then(function (result) {
			if (result[1].AttReadByTypeRsp0.data.attrVal0[val] === 0) {
				deferred.resolve(false);
			} else {
				deferred.resolve(true);
			}
		}).fail(function (err) {;
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Characteristic can\'t Notif or Ind'));
	}

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.setConfig = function (config, callback) {
	var self = this,
		deferred = Q.defer(),
		ownerServ = this.ownerServ,
		val;

	if ((this.prop & GATTDEFS.Prop.Notif.value) || (this.prop & GATTDEFS.Prop.Ind.value)) {
		if (config === false) {
			val = new Buffer([0x00, 0x00]);
		} else if ((this.prop & GATTDEFS.Prop.Notif.value) && (config === true)) { 
			val = new Buffer([0x01, 0x00]);
		} else if ((this.prop & GATTDEFS.Prop.Ind.value) && (config === true)) {
			val = new Buffer([0x00, 0x01]);
		}

		ccBnp.gatt.readUsingCharUuid(ownerServ.ownerDev.connHdl, ownerServ.startHdl, ownerServ.endHdl, new Buffer([0x02, 0x29])).then(function (result) {
			return ccBnp.gatt.writeCharValue(ownerServ.ownerDev.connHdl, result[1].AttReadByTypeRsp0.data.attrHandle0, val);
		}).then(function () {
			deferred.resolve();
		}).fail(function (err) {
			deferred.reject(err);
		});
	} else {
		deferred.reject(new Error('Characteristic can\'t Notif or Ind'));
	}

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.indUpdate = function (value, callback) {
	var self = this,
		deferred = Q.defer();

	this.val = value;
	bledb.update(this._id, {val: value}).then(function (numReplaced) {
        deferred.resolve(numReplaced);
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.expInfo = function () {
	return {
		owner: this.ownerServ._id,
		ancestor: this.ownerServ.ownerDev._id,
		uuid: this.uuid,
		hdl: this.hdl,
		prop: this.prop,
		val: this.val
	};
};

Characteristic.prototype.update = function (callback) {
    var self = this,
        deferred = Q.defer(),
        oldVal = this.val;

    if (GATTDEFS.Prop.get('Read').value & this.prop) {
        this.read().then(function () {
            if (!_.isEqual(oldVal, self.val)) {
                return bledb.update(self._id, {val: self.val});
            } else {
                return;
            }            
        }).then(function (numReplaced) {
            deferred.resolve(numReplaced);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    } else {
        deferred.resolve();
    }    

    return deferred.promise.nodeify(callback);
};

Characteristic.prototype.save = function (callback) {
	var self = this,
		deferred = Q.defer(),
		charInfo = this.expInfo();

	bledb.saveCharInfo(charInfo).then(function (doc) {
		self._id = doc._id;
		deferred.resolve(doc);
	}).fail(function (err) {
		deferred.reject(err);
	}).done();

	return deferred.promise.nodeify(callback);
};

Characteristic.prototype.remove = function (callback) {

};

module.exports = Characteristic;