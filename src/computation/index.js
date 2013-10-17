/**
 *
 * @module Computation
 */

define(['musketeer-module', './tasks'], function (MusketeerModule, tasks) {

    var MAX_WORKERS = 2;

    var module = new MusketeerModule(),
        workers = [];


    function createWorkers(uri) {
        var worker;
        for (var i = 0; i < MAX_WORKERS; i++) {
            worker = new Worker(uri);
            worker.addEventListener('message', workerMessageHandler);
            worker.addEventListener('error', workerErrorHandler);
            workers.push(worker);
        }
    }

    function workerMessageHandler(e) {
        console.log(e.data);
    }

    function workerErrorHandler(e) {
    }

    function taskStartHandler(e) {
    }

    function taskCompleteHandler(e) {
    }

    function taskErrorHandler(e) {
    }

    function postToAllWorkers(data) {
        workers.forEach(function (worker) {
            worker.postMessage(data);
        });
    }


    return module.extend({

        isRunning: false,
        isPaused: false,

        addTask: function (task) {
            tasks.add(task);
        },
        hasTasks: function () {
            return tasks.size > 0
        },
        start: function () {

            this.emit('start');
            if (workers.length === 0) {
                createWorkers('./test.worker.js');
            }
            postToAllWorkers({cmd: 'start'});
            this.isRunning = true;

        },
        pause: function () {
            postToAllWorkers({cmd: 'pause'});
            this.isPaused = true;
        },
        resume: function () {
            postToAllWorkers({cmd: 'resume'});
            this.isPaused = false;
        },
        stop: function () {
            postToAllWorkers({cmd: 'stop'});
            workers.forEach(function (worker) {
                worker.terminate();
            });
            this.isRunning = false;
        }
    });


});