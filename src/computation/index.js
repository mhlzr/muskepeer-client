/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['q', 'muskepeer-module', 'storage/index', 'settings', 'project', 'crypto/index', './collection/jobs', './model/pool', './model/job', './model/result'],


    function (Q, MuskepeerModule, storage, settings, project, crypto, jobs, Pool, Job, Result) {

        var module = new MuskepeerModule(),
            countTimer,
            resultCountTimer,
            jobCountTimer;


        /**
         * @private
         * @method allFound
         */
        function allFound(type, expected) {

            return storage.db.count(type)
                .then(function (amount) {
                    var deferred = Q.defer();

                    logger.log('Computation', amount, type);

                    // We don't know how much to expect, so we can't say
                    if (!expected || expected < 0 || !_.isFinite(expected)) {
                        deferred.resolve(false);
                    }
                    // We already have all results?
                    else if (amount >= expected) {
                        logger.log('Computation', 'All', type, 'found!');
                        deferred.resolve(true);
                    }

                    return deferred.promise;

                });

        }


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
            pool.on('result:found', poolResultFoundHandler);
            pool.on('result:required', poolResultRequiredHandler);

            pool.on('job:found', poolJobFoundHandler);
            pool.on('job:required', poolJobRequiredHandler);

            pool.on('file:found', poolFileFoundHandler);
            pool.on('file:required', poolResultRequiredHandler);

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

            var result = new Result(message.data),
                promise = Q();

            // Using Jobs-Locking?
            if (project.computation.jobs.lock && result.jobUuid) {
                // Unlock the job
                promise = jobs.unlockJob({uuid: result.jobUuid});
            }

            return promise
                .then(function () {
                    // Already existent?
                    return storage.db.has('results', result.uuid, {uuidIsHash: true});
                })
                .then(function (exists) {
                    // Got a fresh new result, store it!
                    if (!exists) {
                        console.log('IS NEW', result.uuid);
                        return storage.db.save('results', result, {uuidIsHash: true})
                            .then(function () {
                                return true;
                            });
                    }
                    else if (project.computation.results.validation.enabled && exists) {

                        console.log('IS NOT NEW', result.uuid);

                        // Get stored result
                        return storage.db.read('results', result.uuid, {uuidIsHash: true})
                            .then(function (resultFromStorage) {

                                //Increase iterations, then Update,
                                result.iteration = resultFromStorage.iteration + 1;

                                // Already did enough iterations, result is now valid
                                if (result.iteration >= project.computation.results.validation.iterations) {
                                    result.isValid = true;

                                    console.log('IS NOW VALID', result.uuid);

                                    // So there is need for the job anymore!
                                    if (project.computation.factories.enabled) {
                                        return jobs.markJobAsComplete({uuid: result.jobUuid})
                                            .then(function () {
                                                console.log('STORIGN VALID ONE');
                                                module.emit('job:push', {job: jobs.getJobByUuid(result.jobUuid)});
                                                return storage.db.update('results', result, {uuidIsHash: true});
                                            });
                                    }
                                    // No need to unlock a job
                                    else return storage.db.update('results', result, {uuidIsHash: true});

                                }
                                else {
                                    //Update
                                    console.log('IS NOT VALID', result.uuid);
                                    return storage.db.update('results', result, {uuidIsHash: true});
                                }


                            }).then(function () {
                                //Pretend it's new
                                return true;
                            })
                    }
                    // Result is not new
                    else return false;

                })
                .then(function (isNew) {

                    // Inform about job status
                    if (project.computation.jobs.lock && result.jobUuid) {
                        module.emit('job:unlock', {uuid: result.jobUuid});
                    }

                    // Inform about new result
                    if (isNew) {
                        module.emit('result:push', result);
                    }


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
         * @method resultCounterCompleteHandler
         * @param e
         */
        function resultCounterCompleteHandler(e) {
            return allFound('results', project.computation.results.expected)
                .then(function (isComplete) {
                    if (isComplete) module.stopWorkers();
                });
        }

        /**
         * @private
         * @method jobCounterCompleteHandler
         * @param e
         */
        function jobCounterCompleteHandler(e) {
            return allFound('jobs', project.computation.jobs.expected)
                .then(function (isComplete) {
                    if (isComplete) module.stopFactories();
                });
        }


        /**
         * @private
         * @method counterCompleteHandler
         * @param e
         */
        function counterCompleteHandler(e) {
            return module.isComplete()
                .then(function (isComplete) {
                    if (isComplete) module.stop();
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

                        // Start the factories if disabled, won't do anyhting
                        if (module.factories) module.factories.start();

                        // Start the workers, same as factories
                        if (module.workers) module.workers.start();

                        // Starting timers
                        countTimer = setInterval(counterCompleteHandler, project.computation.testIntervalTime);
                        resultCountTimer = setInterval(resultCounterCompleteHandler, project.computation.results.testIntervalTime);
                        jobCountTimer = setInterval(jobCounterCompleteHandler, project.computation.jobs.testIntervalTime);


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

                module.stopWorkers();
                module.stopFactories();

                // Global timer
                clearInterval(countTimer);
                countTimer = null;

                this.isRunning = false;
            },

            /**
             * @method stopWorkers
             */
            stopWorkers: function () {
                if (module.workers) {
                    removeEventListenersFromPool(module.workers);
                    module.workers.stop();
                    module.workers = null;

                    clearInterval(resultCountTimer);
                    resultCountTimer = null;
                }
            },

            /**
             * @method stopFactories
             */
            stopFactories: function () {
                if (module.factories) {
                    removeEventListenersFromPool(module.factories);
                    module.factories.stop();
                    module.factories = null;

                    clearInterval(jobCountTimer);


                    jobCountTimer = null;
                }
            },

            /**
             * @method isComplete
             * @return {Promise}
             */
            isComplete: function () {
                var isComplete = true;

                return allFound('results', project.computation.results.expected)
                    .then(function (resultsComplete) {
                        isComplete = resultsComplete;
                        return allFound('jobs', project.computation.jobs.expected)
                    })
                    .then(function (jobsComplete) {
                        return isComplete = isComplete && jobsComplete;
                    })

            }

        });

    })
;