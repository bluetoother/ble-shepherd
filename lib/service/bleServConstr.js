var _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ccBnp = require('ccbnp');

var GATTDEFS = require('../defs/gattdefs');

/*************************************************************************************************/
/*** Local Service Constructor                                                                 ***/
/*************************************************************************************************/
function BleServ (servName, uuid, charsInfo) {
	this._registered = false;
    this.uuid = uuid;
    this.startHdl = null;
    this.endHdl = null;
    this.name = servName ? servName : null;
    this.chars = {};

    this._addChars(charsInfo);
    if (!this.name) {
        this.name = GATTDEFS.ServUuid.get(_.parseInt(this.uuid)).key;
    }
}

util.inherits(BleServ, EventEmitter);

BleServ.prototype._addChars = function (charsInfo) {
	var self = this;

	if (!_.isArray(charsInfo)) { throw new Error('Argument of addChars() must be an array.'); }
	_.forEach(charsInfo, function (charInfo) {
		self.chars[charInfo.uuid] = new BleChar(self, charInfo);
	});
};

BleServ.prototype.assignHdls = function () {
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

BleServ.prototype.findChar = function (hdl) {
    var result;

    _.forEach(this.chars, function (char) {
        _.forEach(char.attrs, function (attr) {
            if (attr.hdl === hdl) { result = char; }
        });
    });

    return result;
};

BleServ.prototype.getAttrs = function () {
    var attrs = [];

    _.forEach(this.chars, function (char) {
        attrs = attrs.concat(char.attrs);
    });

    return attrs;
};

/*************************************************************************************************/
/*** Local Characteristic Constructor                                                          ***/
/*************************************************************************************************/
function BleChar (serv, charInfo) {
    this.name = charInfo.name ? charInfo.name : null; 
    this.uuid = charInfo.uuid;
    this.info = charInfo;
    this.attrs = [];

    this.onMessage = function (msg) {};
    this.onIndMessage = function (type) {};

    this._addAttrs(charInfo);
    if (!this.name) {
    	this.name = GATTDEFS.CharUuid.get(_.parseInt(this.uuid)).key;
    }
}

BleChar.prototype._addAttrs = function (charInfo) {
	var self = this,
		charVal = {
            uuid: charInfo.uuid,
            prop: charInfo.prop,
            hdl: null
        };

	this.attrs.push(new BleAttr('0x2803', GATTDEFS.Permit.get('Read').value, charVal));
	this.attrs.push(new BleAttr(charInfo.uuid, charInfo.permit, charInfo.val));
    this.attrs[0].val.hdl = this.attrs[1].hdl;

    if (charInfo.ccc) {
        this.attrs.push(new BleAttr('0x2902', GATTDEFS.Permit.get('Read').value | GATTDEFS.Permit.get('Write').value, charInfo.ccc));
    }
	if (charInfo.desc) {
		this.attrs.push(new BleAttr('0x2901', GATTDEFS.Permit.get('Read').value, charInfo.desc));
	}
};

/*************************************************************************************************/
/*** Local Attribute Constructor                                                               ***/
/*************************************************************************************************/
function BleAttr (uuid, permit, val) {
    this.uuid = uuid;
    this.permit = permit;
    this.val = val;
    this.hdl = null;
}

module.exports = BleServ;