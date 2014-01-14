/**
 * @module Workers
 * @class Workers
 */

define(['eventemitter2', '../model/worker', 'settings'], function (EventEmitter, Worker, settings) {


    var _self,
        _workers = [],
        _ee = new EventEmitter({delimiter: ':'});


    /**
     * @private
     * @method workerEventHandler
     * @param {Object} e
     */
    function workerEventHandler(e) {
        _self.emit(this.event, e);
    }

    return {

        emit: _ee.emit,
        on: _ee.on,
        off: _ee.off,
        onAny: _ee.onAny,
        offAny: _ee.offAny,

        /**
         * Amount of worker-instances
         * @property size
         *
         */
        size: 0,

        /**
         * @method create
         * @param {String} url Worker-Script
         */
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

        /**
         * @method getWorkerById
         * @param {Number} id
         * @return {Worker}
         */
        getWorkerById: function (id) {
            return _workers[id - 1];
        },

        /**
         * @method start
         */
        start: function () {

            logger.log('Computation', 'Workers started');

            _workers.forEach(function (worker) {
                worker.start();
            });

            this.size = _workers.length;
        },


        /**
         * @method stop
         */
        stop: function () {
            _workers.forEach(function (worker) {
                worker.stop();
                worker.offAny(workerEventHandler);
            });

            // Destroying
            _workers = [];

            this.size = 0;
        },


        /**
         * @method pause
         */
        pause: function () {
            _workers.forEach(function (worker) {
                worker.pause();
            });
        },

        /**
         * @method resume
         */
        resume: function () {
            _workers.forEach(function (worker) {
                worker.resume();
            });
        }


    };
})
;