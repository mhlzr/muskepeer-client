/**
 *
 * @module Computation
 * @class Computation
 */

define(['muskepeer-module', '../storage/index', '../project', './collection/workers', './collection/jobs', './model/job'], function (MuskepeerModule, storage, project, workers, jobs, Job) {

    var module = new MuskepeerModule();

    /**
     * @private
     * @method addWorkerListeners
     */
    function addWorkerListeners() {
        workers.on('job:required');
        workers.on('job:complete');
        workers.on('job:started');
        workers.on('result:required');
        workers.on('result:found');
        workers.on('data:required');
    }


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
         * @property {Object} jobs
         */
        jobs: jobs,

        /**
         * @method start
         */
        start: function () {

            //are there any jobs left, that are related to this project?
            storage.findAndReduceByObject('jobs', {filterDuplicates: false}, {projectUuid: project.uuid})
                .progress(function (job) {
                    jobs.add(job);
                })
                .then(function (results) {

                    logger.log('Computation', 'read all local jobs', results.length);

                    if (workers.size === 0) {
                        workers.create('./worker.js');
                        //workers.create(URL.createObjectURL(project.computation.worker.algorithm()));
                        this.isRunning = true;
                        this.isPaused = false;
                    }


                    // Create jobs if enabled
                    if (jobs.size === 0 && project.computation.jobs.autoGeneration) {
                        module.createAndStoreJobs(project.computation.jobs.groupSize);
                    }

                    addWorkerListeners();

                    logger.log('Computation', 'workers starting');
                    workers.start();

                });


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
        },

        /**
         * @method createAndStoreJobs
         */
        createAndStoreJobs: function (amount) {


            var job;
            for (var i = 0; i < amount; i++) {
                job = new Job(project.computation.jobs.createJobParameters(i));
                jobs.add(job);
            }

            this.jobs = jobs;

            //store node configuration
            storage.saveMultiple('jobs', jobs.list, {allowDuplicates: false, uuidIsHash: true})
                .then(function () {
                    console.log('Jobs saved');
                });

        }
    });
});