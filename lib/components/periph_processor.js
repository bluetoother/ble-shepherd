/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Q = require('q');

var Peripheral = require('../model/peripheral'),
    Service = require('../model/service'),
    butil = require('./bleutil');

var shepherd,
    controller,
    processor = {
        connSpinlock: false,
        connPeriphs: [],
        syncSpinlock: false,
        syncPeriphs: []
    };

processor.newPeriph = function (periphInfo) {
    var periph = shepherd.find(periphInfo.addr);
    
    if (!periph) {
        periph = new Peripheral(periphInfo);
        periph._controller = controller;
    } else {
        periph._original = periphInfo.original ? periphInfo.original : null;
    }

    return periph;
};

processor.connPeriph = function (periph) {
    var self = this,
        connNextPeriph;

    connNextPeriph = function () {
        if (!_.isEmpty(self.connPeriphs))
            process.nextTick(function () {
                self.connPeriph(self.connPeriphs.shift());
            });
        else
            controller.emit('allConnected');
    };

    if (_.indexOf(this.connPeriphs, periph) !== -1)
        return;
    if (this.connSpinlock) {
        return this.connPeriphs.push(periph);
    }

    this.connSpinlock = true;

    periph.connect().then(function () {
        self.connSpinlock = false;
        connNextPeriph();
    }).fail(function (err) {
        self.connSpinlock = false;

        if (err.message === 'Connection Limit Exceeded') 
            return self.idlePeriph();
        else {
            controller.emit('connectErr');
            connNextPeriph();
        }
    }).then(function (addr) {
        self.connSpinlock = false;
        if (addr) 
            self.connPeriph(periph);
    }).fail(function () {
        self.connSpinlock = false;
        setTimeout(function () {
            self.connPeriph(periph);
        }, 1000);
    }).done();
};

processor.syncPeriph = function (periph, oldDeferred) {
    var self = this,
        deferred = oldDeferred ? oldDeferred : Q.defer(),
        updatePeriph;

    updatePeriph = function (periph) {
        if (shepherd._subModule === 'noble' || periph.status === 'disc')
            return self.createPeriph(periph);
        else
            return periph.update();
    };

    if (this.syncSpinlock)
        this.syncPeriphs.push({ periph: periph, deferred: deferred });
    else {
        this.syncSpinlock = true;

        updatePeriph(periph).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            deferred.reject(err);
        }).finally(function () {
            self.syncSpinlock = false;

            if (_.isEmpty(self.syncPeriphs)) return;
            process.nextTick(function () {
                var nextPeriph = self.syncPeriphs.shift();
                self.syncPeriph(nextPeriph.periph, nextPeriph.deferred);
            });
        }).done();
    }

    return deferred.promise;
};

processor.createPeriph = function (periph) {
    var self = this,
        readChars = [];

    return controller.discAllServsAndChars(periph).then(function (servInfos) {
        periph.attatchServs(servInfos);

        _.forEach(periph.servs, function (serv) {
            _.forEach(serv.chars, function (char) {
                if (!_.includes(char.prop, 'read')) return;
                readChars.push(char.read.bind(char));
            });
        });

        return butil.seqResolveQFuncs(readChars);
    });
};

processor.idlePeriph = function () {
    var deferred = Q.defer(),
        periphs = shepherd._periphBox.exportAllObjs(),
        onlinePeriph;

    onlinePeriph = _.find(periphs, function (periph) {
        return periph.status === 'online';
    });

    if (onlinePeriph) {
        onlinePeriph.status = 'idle';
        onlinePeriph.disconnect(function (err) {
            if (err) {
                onlinePeriph.status = 'online';
                deferred.reject(err);
            } else {
                shepherd.emit('IND', {type: 'DEV_IDLE', data: onlinePeriph.addr});
                deferred.resolve(onlinePeriph.addr);
            }
        });
    } else {
        deferred.reject(new Error('No on-line device.'));
    }

    return deferred.promise;
};

module.exports = function (central) {
    shepherd = central;
    controller = shepherd._controller;
    return processor;
};