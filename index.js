'use strict';

module.exports = function (subModule) {
	if (subModule === 'cc-bnp') {
		return require('./lib/cc254x/ble-shepherd');
	} else if (subModule === 'noble') {
		return require('./lib/csr8510/ble-shepherd');
	}
};