/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Q = require('q'),
    Peripheral = require('../model/peripheral'),
    Service = require('../model/service');

var shepherd,
    controller,
    loader = {};

loader.reloadSinglePeriph = function (periphRec) {
    var deferred = Q.defer(),
        periph = shepherd._periphProcessor.newPeriph(periphRec),
        discPeriphFunc;

    periph._id = periphRec.id;
    periph._recovered = true;

    if (shepherd._subModule === 'cc-bnp')
        discPeriphFunc = discCcbnpPeriph;
    else
        discPeriphFunc = discNoblePeriph;

    return discPeriphFunc(periph, periphRec);
};

loader.reloadPeriphs = function () {
    var self = this,
        deferred = Q.defer(),
        total = 0,
        recoverPeriphs = [];

    shepherd._periphBox.findFromDb({}, function (err, periphRecs) {
        if (err)
            deferred.reject(err);
        else {
            periphRecs.forEach(function (periphRec) {
                if (_.isEqual(periphRec.servs, {}))
                    shepherd._periphBox.remove(periphRec.id, function () {});
                else
                    recoverPeriphs.push(self.reloadSinglePeriph(periphRec));
            });

            deferred.resolve(recoverPeriphs.length);
        }
    });

    return deferred.promise;
};

function discCcbnpPeriph (periph, periphRec) {
    var discObj = {
            addrType: periph.addrType,
            addr: periph.addr
        };

    periph.attatchServs(periphRec.servList);
    periph.status = 'offline';

    return shepherd.regPeriph(periph).then(function () {
        controller.emit('discover', [discObj]);
        return;
    });
}



function discNoblePeriph (periph, periphRec) {
    var deferred,
        periphId = periph.addr.slice(2),
        periphAddr = '',
        discHdlr;

    for (var i = 0; i < 6; i += 1) {
        periphAddr += periphId.slice((i*2), (i*2) + 2);
        if (i !== 5)
            periphAddr += ':';
    }

    return shepherd.regPeriph(periph).done(function () {
        controller.regPeriphInfo({ id: periphId, addr: periphAddr, addrType: periph.addrType });
        controller.onDiscover(periphId, periphAddr, periph.addrType, true, {}, null);
        return;
    });
}

module.exports = function (central) {
    shepherd = central;
    controller = shepherd._controller;
    return loader;
};