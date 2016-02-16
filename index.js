'use strict';

module.exports = function (chipName) {
	return require('./lib/' + chipName + '/ble-shepherd');
};