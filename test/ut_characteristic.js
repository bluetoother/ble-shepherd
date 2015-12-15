var _ = require('lodash'),
    should = require('should-promised'),
    ccBnp = require('ccbnp'),
    Char = require('../lib/management/characteristic');

describe('start connection', function() {
    var spConfig = {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,
            rtscts: true,
            flowControl: true
        }
    };

    it('init', function (done) {
        ccBnp.on('ready', function (msg) {
            done();
        });
        ccBnp.init(spConfig, 'central');
    });
});

describe('Constructor Check', function () {

});

describe('Signature Check', function () {

});

describe('Functional Check', function () {

});