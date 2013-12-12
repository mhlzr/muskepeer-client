/**
 *
 * @module Computation
 */

define(['muskepeer-module', '../storage/index', '../project', './collection/workers', './collection/jobs'], function (MuskepeerModule, storage, project, workers, jobs) {

    var module = new MuskepeerModule();

    return module.extend({

        isRunning: false,
        isPaused: false,

        start: function () {
            //are there any jobs left, that are related to this project?
            /* storage.find('jobs')
             .progress(function (job) {
             jobs.add(job);
             })
             .done(function (results) {
             console.log('all local jobs read:', results);
             });
             */

            if (workers.size === 0) {
                workers.create('./worker.js');
                //workers.create(URL.createObjectURL(project.computation.worker.algorithm()));
                this.isRunning = true;
                this.isPaused = false;
            }

            logger.log('Computation', 'workers starting');

            workers.start();

            /*
             workers.on('need:job');
             workers.on('need:result');
             workers.on('need:result');
             */

        },
        pause: function () {
            workers.pause();
            this.isPaused = true;
        },
        resume: function () {
            workers.resume();
            this.isPaused = false;
        },
        stop: function () {
            workers.stop();
            this.isRunning = false;
        }
    });


});