/**
 * @module Pool
 * @class Pool
 */

define(['eventemitter2', 'computation/index', '../model/thread', 'settings'], function (EventEmitter, computation, Thread, settings) {


    return function Pool(type, url, threadAmount) {

        this.type = type;


        var _self = this,
            _threads = [],
            _ee = new EventEmitter({delimiter: ':'});

        this.emit = _ee.emit;
        this.on = _ee.on;
        this.off = _ee.off;
        this.onAny = _ee.onAny;
        this.offAny = _ee.offAny;
        this.removeAllListeners = _ee.removeAllListeners;


        /**
         * @private
         * @method workerEventHandler
         * @param {Object} e
         */
        function threadEventHandler(e) {
            _self.emit(this.event, e);
        }

        /**
         * Amount of worker-instances
         * @property size
         *
         */
        this.size = 0;


        // Creation


        for (var i = 0; i < threadAmount; i++) {
            var thread = new Thread(url);
            thread.id = i + 1;
            thread.type = type;

            // Pass-through events
            thread.onAny(threadEventHandler);

            _threads.push(thread);

        }


        /**
         * @method getThreadById
         * @param {Number} id
         * @return {Worker}
         */
        this.getThreadById = function (id) {
            return _threads[id - 1];
        };

        /**
         * @method start
         */
        this.start = function () {

            logger.log('Computation', this.type + '-Pool', 'started');

            _threads.forEach(function (thread) {
                thread.start();
            });

            this.size = _threads.length;
        };


        /**
         * @method stop
         */
        this.stop = function () {

            logger.log('Computation', this.type + '-Pool', 'stopped');

            _threads.forEach(function (thread) {
                thread.stop();
                thread.offAny(threadEventHandler);
            });

            // Destroying
            _threads = [];

            this.size = 0;
        };


        /**
         * @method pause
         */
        this.pause = function () {
            _threads.forEach(function (thread) {
                thread.pause();
            });
        };


        /**
         * @method resume
         */
        this.resume = function () {
            _threads.forEach(function (thread) {
                thread.resume();
            });
        };

        /**
         * @method pushJobToAwaitingThreads
         * @returns {Array}
         */
        this.pushJobToAwaitingThread = function (job) {

            var threads = _.filter(_threads, function (thread) {
                return thread.isWaitingForJob === true;
            });

            if (threads.length > 0) {
                threads[0].pushJob(job);
            }
        }


    };
});