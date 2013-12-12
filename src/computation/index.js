/**
 *
 * @module Computation
 * @class Computation
 */

define(['muskepeer-module', '../storage/index', '../project', './collection/workers', './collection/jobs'], function (MuskepeerModule, storage, project, workers, jobs) {

    var module = new MuskepeerModule();

    return module.extend({

        /**
         * @property {Boolean} isRunning
         * @default false
         */
        isRunning: false,
        /**
         * @property {Boolean} isPaused
         * @default false
         */
        isPaused: false,

        /**
         * @method start
         */
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
        /**
         * @method pause
         */
        pause: function () {
            workers.pause();
            this.isPaused = true;
        },
        /**
         * @method resume
         */
        resume: function () {
            workers.resume();
            this.isPaused = false;
        },
        /**
         * @method stop
         */
        stop: function () {
            workers.stop();
            this.isRunning = false;
        }
    });


});