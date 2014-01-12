/**
 * @author Matthieu Holzer
 * @date 08.12.13
 */

define(['eventemitter2', '../model/worker', 'settings'], function (EventEmitter, Worker, settings) {


    var _self,
        _workers = [],
        _ee = new EventEmitter({delimiter: ':'});


    function workerEventHandler(e) {
        _self.emit(this.event, e);
    }

    return {

        emit: _ee.emit,
        on: _ee.on,
        off: _ee.off,
        onAny: _ee.onAny,
        offAny: _ee.offAny,

        size: _workers.length || 0,

        create: function (url) {

            _self = this;

            for (var i = 0; i < settings.maxWorkers; i++) {
                var worker = new Worker(url);
                worker.id = i + 1;

                // Pass-through events
                worker.onAny(workerEventHandler);
                _workers.push(worker);

            }
        },

        getWorkerById: function (id) {
            return _workers[id - 1];
        },

        start: function () {

            logger.log('Computation', 'Workers started');

            _workers.forEach(function (worker) {
                worker.start();
            });
        },

        stop: function () {
            _workers.forEach(function (worker) {
                worker.stop();
                worker.offAny(workerEventHandler);
            });

            // Destroying
            _workers = [];
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