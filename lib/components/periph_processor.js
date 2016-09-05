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
        periph.parent = shepherd.bleCentral.addr;
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
    if (this.connSpinlock) 
        return this.connPeriphs.push(periph);

    this.connSpinlock = true;

    connect(periph).then(function () {
        self.connSpinlock = false;
        connNextPeriph();
    }).fail(function (err) {
        self.connSpinlock = false;

        if (err.message === 'Connection Limit Exceeded') 
            return self.idlePeriph();
        else {
            controller.emit('connectErr', { addr: periph.addr, err: err });
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
            return periph.maintain();
    };

    if (this.syncSpinlock)
        this.syncPeriphs.push({ periph: periph, deferred: deferred });
    else {
        this.syncSpinlock = true;
        periph._synchronizing = true;

        updatePeriph(periph).then(function () {
            deferred.resolve();
        }).fail(function (err) {
            controller.emit('connectErr', { addr: periph.addr, err: err });
            deferred.reject(err);
        }).finally(function () {
            self.syncSpinlock = false;
            delete periph._synchronizing;

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
        deferred = Q.defer(),
        readChars = [];
        
    controller.discAllServsAndChars(periph).then(function (servInfos) {
        if (periph.servs) periph.servs = {};
        periph.attatchServs(servInfos);

        _.forEach(periph.servs, function (serv) {
            _.forEach(serv.chars, function (char) {
                if (!_.includes(char.prop, 'read')) return;
                readChars.push(char.read.bind(char));
            });
        });

        return butil.seqResolveQFuncs(readChars);
    }).done(function (result) {
        deferred.resolve(result);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

processor.idlePeriph = function () {
    var deferred = Q.defer(),
        periphs = shepherd._periphBox.exportAllObjs(),
        onlinePeriphs,
        lazyPeriph;

    onlinePeriphs = _.filter(periphs, function (periph) {
        return periph.status === 'online';
    });

    _.forEach(onlinePeriphs, function (periph) {
        if (!lazyPeriph) {
            lazyPeriph = periph;
        } else {
            if (lazyPeriph._score() > periph._score())
                lazyPeriph = periph;
            else if (lazyPeriph._score() === periph._score())
                if (lazyPeriph.joinTime > periph.joinTime)
                    lazyPeriph = periph;
        }
    });

    if (lazyPeriph) {
        lazyPeriph.status = 'idle';
        lazyPeriph.disconnect(function (err) {
            if (err) {
                lazyPeriph.status = 'online';
                deferred.reject(err);
            } else {
                _.forEach(periphs, function (periph) {
                    periph._indCount = 0;
                    periph._cmdCount = 0;
                });
                shepherd.emit('ind', { type: 'devStatus', periph: lazyPeriph, data: lazyPeriph.status });
                deferred.resolve(lazyPeriph.addr);
            }
        });
    } else {
        deferred.reject(new Error('No on-line device.'));
    }

    return deferred.promise;
};

function connect (periph) {
    var deferred = Q.defer(),
        timeout;

    if (!_.isNil(periph.connHandle)) {
        periph.status = 'online';
        deferred.resolve();
    } else {
        timeout = setTimeout(function () {
            controller.connectCancel(periph);
        }, 1500); //[TODO]
      
        controller.connect(periph).done(function (addr) {
            clearTimeout(timeout);
            timeout = null;
            deferred.resolve();
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise;
}

module.exports = function (central) {
    shepherd = central;
    controller = shepherd._controller;
    return processor;
};