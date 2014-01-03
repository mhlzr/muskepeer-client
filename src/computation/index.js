/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['muskepeer-module', '../storage/index', '../project', './collection/workers', './collection/jobs', './model/job'], function (MuskepeerModule, storage, project, workers, jobs, Job) {

    var module = new MuskepeerModule();

    /**
     * @private
     * @method addWorkerListeners
     */
    function addWorkerListeners() {
        /*workers.on('job:required');
         workers.on('job:complete');
         workers.on('job:started');
         workers.on('result:required');
         workers.on('result:found');
         workers.on('data:required');*/
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

            // are there any jobs left, that are related to this project?
            storage.db.findAndReduceByObject('jobs', {filterDuplicates: false}, {projectUuid: project.uuid})
                .progress(function (job) {
                    jobs.add(job);
                })
                .then(function (results) {

                    logger.log('Computation', 'available local jobs', results.length);

                    // Create workers
                    if (workers.size === 0) {

                        // Get the cached worker-script from local fileSystem
                        storage.fs.getFileInfoByUri(project.computation.workerUrl)
                            .then(function (fileInfos) {
                                return storage.fs.readFileAsLocalUrl(fileInfos[0]);
                            })
                            .then(function (localUrl) {

                                workers.create(localUrl);


                                addWorkerListeners();

                                // Start the workers
                                workers.start();

                                logger.log('Computation', 'workers started');

                                this.isRunning = true;
                                this.isPaused = false;
                            });

                    }

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
        }

    });
});