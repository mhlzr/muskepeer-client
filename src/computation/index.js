/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['q', 'muskepeer-module', 'storage/index', 'settings', 'project', 'crypto/index', './collection/jobs', './model/pool', './model/job', './model/result'],


    function (Q, MuskepeerModule, storage, settings, project, crypto, jobs, Pool, Job, Result) {

        var module = new MuskepeerModule(),
            resultCountInterval;


        function createThreadPool(type, url, amount) {

            // Get the cached script from local fileSystem
            return storage.fs.getFileInfoByUri(url)
                .then(function (fileInfos) {
                    return storage.fs.readFileAsLocalUrl(fileInfos[0]);
                })
                .then(function (localUrl) {

                    var amount = 1;

                    if (type === module.WORKER) {

                        if (project.computation.workers.multipleAllowed) {
                            amount = settings.maxWorkers;
                        }

                        module.workers = new Pool(module.WORKER, localUrl, amount);
                    }
                    else {

                        if (project.computation.factories.multipleAllowed) {
                            amount = settings.maxFactories;
                        }

                        module.factories = new Pool(module.FACTORY, localUrl, amount);
                    }

                });
        }


        /**
         * Create worker instances
         *
         * @private
         * @method createWorkers
         * @return {Promise}
         */
        function createWorkers() {

            // No need for Workers
            if (!project.computation.workers.enabled) {
                logger.log('Computation', 'Not using Workers');
                return Q();
            }
            // Already initiated?
            else if (module.workers) {
                return Q();
            }

            // Instantiate workers
            else {
                logger.log('Computation', 'Creating Workers');


                return createThreadPool(module.WORKER, project.computation.workers.url)
                    .then(function () {
                        addEventListenersToPool(module.workers);
                    })
            }

        }


        /**
         * Create jobFactory
         *
         * @private
         * @method createFactories
         * @return {Promise}
         */
        function createFactories() {

            // No need for Workers
            if (!project.computation.factories.enabled) {
                logger.log('Computation', 'Not using Factories');
                return Q();
            }
            // Already initiated?
            else if (module.factories) {
                return Q();
            }

            // Instantiate workers
            else {
                logger.log('Computation', 'Creating Factories');

                return createThreadPool(module.FACTORY, project.computation.factories.url)
                    .then(function () {
                        addEventListenersToPool(module.factories);
                    })
            }

        }


        /**
         * @private
         * @method addEventListenersToPool
         */
        function addEventListenersToPool(pool) {
            pool.on('job:required', poolJobRequiredHandler);
            pool.on('result:found', poolResultFoundHandler);
            pool.on('result:required', poolResultRequiredHandler);
            pool.on('file:required', poolResultRequiredHandler);
            pool.on('job:found', poolJobFoundHandler);
            pool.on('file:found', poolFileFoundHandler);
        }

        /**
         * @private
         * @method removeEventListenersFromPool
         */
        function removeEventListenersFromPool(pool) {
            pool.removeAllListeners();
        }

        /**
         * @private
         * @method poolJobFoundHandler
         */
        function poolJobFoundHandler(message) {
            var job = new Job(message.data);
            // Add job to queue (if redundant it will be ignored)
            jobs.add(job);
        }


        /**
         * @private
         * @method poolResultRequiredHandler
         */
        function poolResultRequiredHandler(message) {

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
         * @method poolJobRequiredHandler
         */
        function poolJobRequiredHandler(message) {

            // Specific job?
            if (message.data && message.data.uuid) {

                logger.log('Worker ' + message.id, 'needs specific job ' + message.data.uuid);

                jobs.getJobByUuid(message.data.uuid).then(function (job) {
                    if (job) {
                        // Push to worker
                        workers.getWorkerById(message.id).pushJob(job);
                    }
                });
            }
            // Use next job in queue
            else {
                logger.log('Worker ' + message.id, 'needs job');

                jobs.getNextAvailableJob().then(function (job) {

                        if (!job) {
                            logger.log('Computation', 'No more jobs left!');
                            return;
                        }

                        //Lock job
                        jobs.lockJob(job)
                            .then(function () {

                                // Need to publish lock?
                                if (project.computation.jobs.lock) {
                                    module.emit('job:lock', {uuid: job.uuid})
                                }

                                // Send to worker
                                workers.getWorkerById(message.id).pushJob(job);
                            });

                    }
                );
            }
        }


        /**
         * @private
         * @method poolResultFoundHandler
         */
        function poolResultFoundHandler(message) {

            var result = new Result(message.data);


            if (result.jobUuid) {
                // Unlock the job
                jobs.unlockJob({uuid: result.jobUuid}).then(function () {
                    //TODO check iterations
                    // Inform network
                    module.emit('job:finished', {uuid: result.jobUuid});

                    return jobs.markJobAsFinished({uuid: result.jobUuid});
                });

            }


            // Already existent?
            return storage.db.has('results', result.uuid, {uuidIsHash: true})
                .then(function (resultInStorage) {
                    var deferred = Q.defer();

                    if (resultInStorage) {
                        deferred.resolve(false);
                        //result.iteration = resultInStorage.iteration + 1;
                    }
                    else {
                        deferred.resolve(true);
                    }
                    return deferred.promise;
                })
                .then(function (isNew) {


                    if (isNew) {

                        // Inform network module which will broadcast/publish
                        module.emit('result:push', result);

                        // Store result to local database
                        return storage.db.save('results', result, {uuidIsHash: true});

                    }

                    // Already did enough iterations, no need to save/update
                    /*if (project.computation.validationIterations > 0
                     && result.iteration > project.computation.validationIterations) {
                     return;
                     }*/
                });

        }

        /**
         * @private
         * @method poolFileFoundHandler
         */
        function poolFileFoundHandler(message) {
            logger.log('Thread ' + message.id, 'found a file');
        }


        /**
         * @private
         * @method resultCountIntervalCompleteHandler
         * @param e
         */
        function resultCountIntervalCompleteHandler(e) {

            return module.isComplete()
                .then(function (isComplete) {
                    if (isComplete) {
                        logger.log('Computation', 'All results found, stopping computation.');
                        // We're done here!
                        module.stop();
                    }
                });
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

            workers: null,
            factories: null,

            WORKER: 'Worker',
            FACTORY: 'Factory',


            /**
             * @method start
             */
            start: function () {

                if (this.isRunning) return;

                logger.log('Computation', 'Starting');

                createFactories()
                    .then(createWorkers)
                    .then(function () {

                        // Start the factories is disabled, won't do anyhting
                        if (module.factories) module.factories.start();

                        // Start the workers, same as factories
                        if (module.workers) module.workers.start();

                        resultCountInterval = setInterval(resultCountIntervalCompleteHandler, project.computation.results.countTimeInterval);

                    });

                this.isRunning = true;
                this.isPaused = false;

            },
            /**
             * @method pause
             */
            pause: function () {
                logger.log('Computation', 'Pause');
                module.factories.pause();
                module.workers.pause();
                this.isPaused = true;
            },
            /**
             * @method resume
             */
            resume: function () {
                logger.log('Computation', 'Resume');
                module.factories.resume();
                module.workers.resume();
                this.isPaused = false;
            },
            /**
             * @method stop
             */
            stop: function () {

                if (!this.isRunning) return;

                logger.log('Computation', 'Stopping');


                if (module.workers) {
                    removeEventListenersFromPool(module.workers);
                    module.workers.stop();
                }

                if (module.factories) {
                    removeEventListenersFromPool(module.factories);
                    module.factories.stop();
                }

                // Stop the timer
                clearInterval(resultCountInterval);
                resultCountInterval = null;


                this.isRunning = false;
            },

            /**
             * @method isComplete
             * @return {Promise}
             */
            isComplete: function () {
                return storage.db.count('results')
                    .then(function (amount) {
                        var deferred = Q.defer();

                        logger.log('Computation', amount, 'results');

                        // We don't know how much to expect, so we can't say
                        if (!project.computation.results.expected < 0 || !_.isFinite(project.computation.results.expected)) {
                            deferred.resolve(false);
                        }

                        // We already have all results?
                        if (amount >= project.computation.results.expected) {
                            deferred.resolve(true);
                        }
                        return deferred.promise;
                    });

            }

        });

    });