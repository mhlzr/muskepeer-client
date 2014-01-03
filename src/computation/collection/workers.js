/**
 * @author Matthieu Holzer
 * @date 08.12.13
 */

define(['eventemitter2', '../model/worker', 'settings'], function (EventEmitter, Worker, settings) {


    var _workers = [],
        _ee = new EventEmitter({delimiter: ':'});

    return {

        emit: _ee.emit,
        on: _ee.on,
        off: _ee.off,
        any: _ee.any,

        size: _workers.length || 0,

        create: function (url) {
            var self = this;

            for (var i = 0; i < settings.maxWorkers; i++) {
                var worker = new Worker(url);
                worker.id = i + 1;

                // Pass-through events
                worker.onAny(function (e) {
                    self.emit(this.event, e);
                });

                _workers.push(worker);

            }
        },

        getWorkerById: function (id) {
            return _workers[id - 1];
        },

        start: function () {
            _workers.forEach(function (worker) {
                worker.start();
            });
        },

        stop: function () {
            _workers.forEach(function (worker) {
                worker.stop();
            });
        },

        pause: function () {
            _workers.forEach(function (worker) {
                worker.pause();
            });
        },

        resume: function () {
            _workers.forEach(function (worker) {
                worker.resume();
            });
        }


    };
})
;