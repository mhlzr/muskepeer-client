/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['q', 'muskepeer-module', 'storage/index', 'settings', 'project', 'crypto/index', './collection/jobs', './collection/results', './model/pool', './model/job', './model/result'],


    function (Q, MuskepeerModule, storage, settings, project, crypto, jobs, results, Pool, Job, Result) {

        var module = new MuskepeerModule(),
            countTimer,
            resultCountTimer,
            jobCountTimer;


        /**
         * @private
         * @method allFound
         * @param type
         * @param expected
         * @return {Promise}
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

                    // We already have all found?
                    else if (amount >= expected) {
                        // Need to check validity?
                        if (type === 'results' && project.computation.results.validation.enabled) {

                            results.allValid()
                                .then(function (answer) {
                                    if (answer) {
                                        logger.log('Computation', 'All results are valid!');
                                    }
                                    else {
                                        logger.log('Computation', 'Results are not all valid!');
                                    }
                                    deferred.resolve(answer);
                                });
                        }
                        else {
                            logger.log('Computation', 'All', type, 'found!');
                            deferred.resolve(true);
                        }
                    }
                    else {
                        deferred.resolve(false);
                    }

                    return deferred.promise;

                }

            );
        }


        /**
         * @private
         * @method createThreadPool
         *
         * @param type
         * @param url
         * @return {Promise}
         */
        function createThreadPool(type, url) {

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
            pool.on('result:push', poolResultFoundHandler);
            pool.on('result:pull', poolResultRequiredHandler);

            pool.on('job:push', poolJobFoundHandler);
            pool.on('job:pull', poolJobRequiredHandler);

            pool.on('file:push', poolFileFoundHandler);
            pool.on('file:pull', poolFileRequiredHandler);

        }

        /**
         * @private
         * @method removeEventListenersFromPool
         */
        function removeEventListenersFromPool(pool) {
            pool.removeAllListeners();
        }

        /**
         * Event-Listener, listens for
         * job:push from Thread-Pool
         *
         * @private
         * @method poolJobFoundHandler
         */
        function poolJobFoundHandler(e) {

            logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'found a job');

            var job = new Job(e.data);
            // Add job to queue (if redundant it will be ignored)
            jobs.add(job);
        }

        /**
         * Event-Listener, listens for
         * job:pull from Thread-Pool
         *
         * @private
         * @method poolJobRequiredHandler
         */
        function poolJobRequiredHandler(e) {

            // Specific job?
            if (e.data && e.data.uuid) {

                logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a specific job');

                jobs.getJobByUuid(e.data.uuid).then(function (job) {
                    if (job) {
                        e.target.pushJob(job);
                    }
                });
            }
            // Use next job in queue
            else {

                logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a job');

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

                                e.target.pushJob(job);
                            });

                    }
                );
            }
        }


        /**
         * Event-Listener, listens for
         * result:push from Thread-Pool
         *
         * @private
         * @method poolResultFoundHandler
         */
        function poolResultFoundHandler(e) {

            var result = new Result(e.data),
                promise = Q();

            logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'found a result');

            // Using Jobs-Locking?
            if (project.computation.jobs.lock && result.jobUuid) {
                // Unlock the job
                promise = jobs.unlockJob({uuid: result.jobUuid});
            }

            return promise
                .then(function () {
                    return results.add(result)
                })
                .then(function (hasChanged) {

                    // Inform about job status
                    if (project.computation.jobs.lock && result.jobUuid) {
                        module.emit('job:unlock', {uuid: result.jobUuid});
                    }

                    if (hasChanged) {

                        // Inform about new or changed result
                        module.emit('result:push', result);

                        // What about the job?
                        if (project.computation.factories.enabled && result.jobUuid) {

                            if (results.isValid(result)) {
                                return jobs.markJobAsComplete({uuid: result.jobUuid})
                                    .then(function () {
                                        module.emit('job:push', {job: jobs.getJobByUuid(result.jobUuid)});
                                    });
                            }
                        }
                    }
                });
        }


        /**
         * Event-Listener, listens for
         * result:pull from Thread-Pool
         *
         * @private
         * @method poolResultRequiredHandler
         */
        function poolResultRequiredHandler(e) {

            if (!e.data.uuid) return;

            logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a specific result');

            // Get result from storage
            storage.db.read('results', e.data.uuid)
                .then(function (result) {
                    e.target.pushResult(result);
                });

        }


        /**
         * Event-Listener, listens for
         * file:push from Thread-Pool
         *
         * @private
         * @method poolFileFoundHandler
         */
        function poolFileFoundHandler(e) {
            //TODO pass a url or name, actually name would be better
            logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'found a file');
        }

        /**
         * Event-Listener, listens for
         * file:pull from Thread-Pool
         *
         * @private
         * @method poolFileRequiredHandler
         */
        function poolFileRequiredHandler(e) {

            var promise,
                fileInfo;

            if (!e.data || ( !e.data.url && !e.data.name )) {
                return;
            }

            // Get file by url
            if (e.data.url) {
                logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a specific file (gave url)');
                promise = storage.fs.getFileInfoByUri(e.data.url);

            }
            // Get file by name
            else if (e.data.name) {
                logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a specific file (gave name: ' + e.data.name + ')');
                promise = storage.fs.getFileInfoByName(e.data.name);
            }

            promise
                .then(function (info) {
                    fileInfo = info[0];

                    var offset = e.data.offset || 0,
                        completeFile = offset === 0;

                    // FileSystem Path
                    if (e.data.type === 'path') {
                        return project.uuid + '/' + fileInfo.uuid;
                    }
                    // Blob
                    if (e.data.type === 'blob') {
                        return storage.fs.readFileChunkAsBlob(fileInfo, offset, completeFile);
                    }
                    // DataUrl
                    else if (e.data.type === 'dataUrl') {
                        return storage.fs.readFileChunkAsDataUrl(fileInfo, offset, completeFile);
                    }
                    // Default is localUrl
                    else {
                        return storage.fs.readFileAsLocalUrl(fileInfo)
                    }

                }).then(function (file) {
                    e.target.pushFile(fileInfo, file);
                })


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

            /**
             * @property {Object} results
             */
            results: results,

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
                        countTimer = window.setInterval(counterCompleteHandler, project.computation.testIntervalTime);
                        resultCountTimer = window.setInterval(resultCounterCompleteHandler, project.computation.results.testIntervalTime);
                        jobCountTimer = window.setInterval(jobCounterCompleteHandler, project.computation.jobs.testIntervalTime);


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
                window.clearInterval(countTimer);
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
                    window.clearInterval(resultCountTimer);
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
                    window.clearInterval(jobCountTimer);

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