/**
 *
 * @module Computation
 */

define(['musketeer-module', '../storage/index', '../project', './jobs'], function (MusketeerModule, storage, project, jobs) {

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

        start: function () {

            //storage is initialized async,
            // if not yet read we wait for the event
            if (!storage.isReady) {
                storage.on('ready', module.start);
                return;
            }
            else {
                storage.off('ready', module.start);
            }

            //are there any jobs left, that are related to this project?
            storage.find('jobs')
                .progress(function (job) {
                    jobs.add(job);
                })
                .done(function (results) {
                    console.log('all jobs read:' , results);
                });


            if (workers.length === 0) {
                createWorkers('./worker.js');
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