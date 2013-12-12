/**
 * @author Matthieu Holzer
 * @date 08.12.13
 */

define(['../model/worker'], function (Worker) {

    var MAX_WORKERS = 2;

    var _workers = [];

    return {

        size: _workers.length || 0,

        create: function (url) {
            var self = this;

            for (var i = 0; i < MAX_WORKERS; i++) {
                var worker = new Worker(url);
                worker.id = i + 1;

                worker.on('job', function (id) {
                    logger.log('Worker ' + id, 'needs job');
                    self.getWorkerById(id).process({foo: 'bar'});
                });

                worker.on('result', function (id, result) {
                    logger.log('Worker ' + id, result, 'has result');

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
});