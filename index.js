var BShepherd = require('./lib/shepherd');

module.exports = function (subModule) {
	return new BShepherd(subModule);
};