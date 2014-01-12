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

                addWorkerEventListeners();

            });


    }


    function addWorkerEventListeners() {
        workers.on('job:required', workerJobRequiredHandler);
        workers.on('result:found', workerResultFoundHandler);
        workers.on('result:required', workerResultRequiredHandler);
        workers.on('file:required', workerResultRequiredHandler);

        // It's possible, that during computing a Worker finds an (unsolved) job
        workers.on('job:found', jobFactoryMessageHandler);
        // Or even found a new file (created one)
        workers.on('file:found', workerFileFoundHandler)
    }

    function removeWorkerEventListeners() {
        workers.off('job:required', workerJobRequiredHandler);
        workers.off('result:found', workerResultFoundHandler);
        workers.off('result:required', workerResultRequiredHandler);
        workers.off('file:required', workerResultRequiredHandler);
        workers.off('job:found', jobFactoryMessageHandler);
        workers.off('file:found', workerFileFoundHandler)

    }

    function addJobFactoryListeners() {
        module.jobFactory.addEventListener('message', jobFactoryMessageHandler);
        module.jobFactory.addEventListener('error', jobFactoryErrorHandler);
    }

    function removeJobFactoryListeners() {
        module.jobFactory.removeEventListener('message', jobFactoryMessageHandler);
        module.jobFactory.removeEventListener('error', jobFactoryErrorHandler);
    }


    function createJobFactory() {

        // No need for a JobFactory
        if (!project.computation.useJobList) {
            return null;
        }

        // Instantiate JobFactory
        return storage.fs.getFileInfoByUri(project.computation.jobFactoryUrl)
            .then(function (fileInfos) {
                return storage.fs.readFileAsLocalUrl(fileInfos[0]);
            })
            .then(function (localUrl) {
                this.jobFactory = new Worker(localUrl);
                addJobFactoryListeners();
                this.jobFactory.postMessage({cmd: 'start'});

                logger.log('Computation', 'JobFactory started');
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

            jobs.getJobByUuid(message.data.uuid).then(function (job) {
                // Push to worker
                workers.getWorkerById(message.id).pushJob(job);
            });
        }
        // Next job in queue
        else {
            logger.log('Worker ' + message.id, 'needs job');

            jobs.getNextAvailableJob().then(function (job) {

                if (!job) {
                    logger.log('Computation', 'No more jobs left!');
                }

                jobs.lockJob(job)
                    .then(function () {
                        workers.getWorkerById(message.id).pushJob(job);
                    });
            });

        }

    }


    /**
     * @private
     * @method workerResultFoundHandler
     */
    function workerResultFoundHandler(message) {

        var isNew = true,
            result = new Result(message.data);


        if (result.jobUuid) {
            // Unlock the job
            jobs.unlockJob({uuid: result.jobUuid}).then(function () {
                //TODO check iterations
                return jobs.markJobAsFinished({uuid: result.jobUuid});
            });

        }


        // Already existent?
        storage.db.has('results', result.uuid, {uuidIsHash: true})
            .then(function (resultInStorage) {
                if (resultInStorage) {
                    isNew = false;
                    //result.iteration = resultInStorage.iteration + 1;
                }
            })
            .then(function () {

                // Already did enough iterations, no need to save/update
                /*if (project.computation.validationIterations > 0
                 && result.iteration > project.computation.validationIterations) {
                 return;
                 }*/

                if (isNew) {
                    logger.log('Worker ' + message.id, 'has new result', result.uuid, message.data);

                    // Inform network module which will broadcast/publish
                    network.publish('result', result);

                    // Store result to local database
                    return storage.db.save('results', result, {uuidIsHash: true});


                }
                else return null;


                // Count amount of results
                /* if (project.computation.validationIterations > 0) {
                 return storage.db.findAndReduceByObject('results', {}, {iteration: project.computation.validationIterations });
                 }*/
            })
            .then(module.isComplete)
            .then(function (isComplete) {
                if (isComplete) {
                    // We're done here!
                    module.stop();
                    logger.log('Computation', 'all results found, stopping computation.');
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

            createJobFactory()
                .then(createWorkers)
                .then(function () {
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
            removeWorkerEventListeners();
            removeJobFactoryListeners();
            this.jobFactory.terminate();
            this.jobFactory = null;
            workers.stop();
            this.isRunning = false;
        },

        /**
         * @method isComplete
         * @return {Promise}
         */
        isComplete: function () {
            return storage.db.findAndReduceByObject('results', {}, {})
                .then(function (results) {
                    var deferred = Q.defer();

                    // We don't know how much to expect, so we can't say
                    if (!project.computation.expectedResults || !_.isFinite(project.computation.expectedResults)) {
                        deferred.resolve(false);
                    }

                    // We already have all results?
                    if (results.length >= project.computation.expectedResults) {
                        deferred.resolve(true);
                    }
                    return deferred.promise;
                });

        }

    });

});