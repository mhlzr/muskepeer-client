/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['muskepeer-module', '../storage/index', '../network/index', '../project', './collection/workers', 'crypto/index', './collection/jobs', './model/job', './model/result'], function (MuskepeerModule, storage, network, project, workers, crypto, jobs, Job, Result) {

    var module = new MuskepeerModule();


    /**
     * @private
     * @method createWorkers
     */
    function createWorkers() {

        // Already initiated?
        if (workers.size !== 0) return;

        // Get the cached worker-script from local fileSystem
        return storage.fs.getFileInfoByUri(project.computation.workerUrl)
            .then(function (fileInfos) {
                return storage.fs.readFileAsLocalUrl(fileInfos[0]);
            })
            .then(function (localUrl) {

                workers.create(localUrl);

                // Add worker listeners
                workers.on('job:required', workerJobRequiredHandler);
                workers.on('result:found', workerResultFoundHandler);
                workers.on('result:required', workerResultRequiredHandler);
                workers.on('file:required', workerResultRequiredHandler);

                // It's possible, that during computing a Worker finds an (unsolved) job
                workers.on('job:found', jobFactoryMessageHandler);
                // Or even found a new file (created one)
                workers.on('file:found', workerFileFoundHandler)

            });


    }

    /**
     * @private
     * @method jobFactoryMessageHandler
     */
    function jobFactoryMessageHandler(message) {
        var job = new Job(message.data);

        // Add job to queue (if redundant it will be ignored)
        jobs.add(job);

        // Save job to storage (same as above)
        storage.db.save('jobs', job, {uuidIsHash: true});
    }

    /**
     * @private
     * @method jobFactoryErrorHandler
     */
    function jobFactoryErrorHandler(error) {
        logger.error('JobFactory', 'an error occurred');
    }

    /**
     * @private
     * @method workerResultRequiredHandler
     */
    function workerResultRequiredHandler(message) {

        if (!message.data.uuid) return;

        logger.log('Worker ' + message.id, 'needs result ' + message.data.uuid);

        // Get result from storage
        storage.db.read('results', message.data.uuid)
            .then(function (result) {
                // Push to worker
                workers.getWorkerById(message.id).pushResult(result);
            });

    }

    /**
     * @private
     * @method workerJobRequiredHandler
     */
    function workerJobRequiredHandler(message) {

        // Specific job?
        if (message.data && message.data.uuid) {

            logger.log('Worker ' + message.id, 'needs specific job ' + message.data.uuid);

            storage.db.read('jobs', message.data.uuid)
                .then(function (job) {
                    // Push to worker
                    workers.getWorkerById(message.id).pushJob(job);
                });
        }
        // Next job in queue
        else {
            logger.log('Worker ' + message.id, 'needs job');
            workers.getWorkerById(message.id).pushJob(jobs.getNext());
        }

    }

    /**
     * @private
     * @method workerResultFoundHandler
     */
    function workerResultFoundHandler(message) {

        var isNew = true,
            result = new Result(message.data);

        logger.log('Worker ' + message.id, 'has result', result.uuid, message.data);

        // Already existent?
        storage.db.read('results', result.uuid, {uuidIsHash: true})
            .then(function (resultInStorage) {
                if (resultInStorage) {
                    isNew = false;
                    result.iteration = resultInStorage.iteration + 1;
                }
            })
            .then(function () {

                // Already did enough iterations, no need to save/update
                if (project.computation.validationIterations > 0
                    && result.iteration > project.computation.validationIterations) {
                    return;
                }

                // Store result to local database
                storage.db.save('results', result, {uuidIsHash: true});


                if (isNew) {
                    externalStorageServices.forEach(function (service) {
                        if (isNew) {
                            // Save to externalStorages
                            service.save(result);
                        }
                        else {
                            // Update
                            service.update(result.uuid, result);
                        }
                    });
                }


                // Broadcast if new || mutipleIterations
                network.peers.broadcast('result', result);

                // Count amount of results
                if (project.computation.validationIterations > 0) {
                    return storage.db.findAndReduceByObject('results', {}, {iteration: project.computation.validationIterations });
                }
            })
            .then(function (results) {
                // We already have all results?
                if (results.length >= project.computation.expectedResults) {
                    this.stop();
                    logger.log('Computatiion', 'all results found');
                }
            }
        )
    }

    /**
     * @private
     * @method workerFileFoundHandler
     */
    function workerFileFoundHandler(message) {
        logger.log('Worker ' + message.id, 'found a file');
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
         * @property {Worker} jobFactory
         */
        jobFactory: null,

        /**
         * @method start
         */
        start: function () {


            if (project.computation.useJobList) {

                // Instantiate JobFactory if enabled
                storage.fs.getFileInfoByUri(project.computation.jobFactoryUrl)
                    .then(function (fileInfos) {
                        return storage.fs.readFileAsLocalUrl(fileInfos[0]);
                    })
                    .then(function (localUrl) {
                        this.jobFactory = new Worker(localUrl);
                        this.jobFactory.addEventListener('message', jobFactoryMessageHandler);
                        this.jobFactory.addEventListener('error', jobFactoryErrorHandler);
                        this.jobFactory.postMessage({cmd: 'start'});

                        logger.log('Computation', 'JobFactory started');
                    });


                // Read unfinished stored jobs from storage
                storage.db.findAndReduceByObject('jobs', {filterDuplicates: false}, {projectUuid: project.uuid})
                    .progress(function (job) {
                        jobs.add(job);
                    })
                    .then(function (results) {
                        logger.log('Computation', 'has ' + results.length + ' local jobs');
                    });
            }


            createWorkers().then(function () {
                // Start the workers
                workers.start();

                logger.log('Computation', 'Workers started');

                this.isRunning = true;
                this.isPaused = false;
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
})
;