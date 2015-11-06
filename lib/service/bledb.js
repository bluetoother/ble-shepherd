var Datastore = require('nedb'),
	Q = require('q'),
	_ = require('lodash');

var db = new Datastore({ filename: '../ble.db', autoload: true });