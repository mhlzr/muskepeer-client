/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['lodash', 'q', 'muskepeer-module', 'storage/index', 'settings', 'project', 'crypto/index', './collection/jobs', './collection/results', './model/pool', './model/job', './model/result'],


    function (_, Q, MuskepeerModule, storage, settings, project, crypto, jobs, results, Pool, Job, Result) {


        var module = new MuskepeerModule(),
            countTimer,
            resultCountTimer,
            jobCountTimer;


        /**
         * @private
         * @method allFound
         * @param type
         * @param expected
         * @param {Boolean} silent Pirnt the current status?
         * @return {Promise}
         */
        function allFound(type, expected, silent) {

            silent = silent || false;

            var collection = results,
                amount;

            // If not enabled no need to check the module
            if ((type === 'results' && !project.computation.workers.enabled) ||
                (type === 'jobs' && !project.computation.factories.enabled)) {
                return true;
            }

            // We don't know how much to expect, so we can't say
            if (!expected || expected < 0 || !_.isFinite(expected)) {
                return false;
            }

            // Switch to jobs if needed
            if (type === 'jobs') {
                collection = jobs;
            }

            // Read amount of data
            amount = collection.cache.size();


            if (!silent) {
                logger.log('Computation', amount, type);
            }


            // We already found all?
            if (amount >= expected) {

                if (!silent) {
                    logger.log('Computation', 'All', type, 'found!');
                }

                // Need to check validity?
                if (type === 'results' && project.computation.results.validation.enabled) {

                    if (results.allValid()) {
                        if (!silent) {
                            logger.log('Computation', 'All results are valid!');
                        }
                        return true;
                    }
                    else {
                        if (!silent) {
                            logger.log('Computation', 'Results are not all valid!');
                        }
                        return false;
                    }

                }
                else {
                    return true;
                }


            }

            return false;


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

            var expected = project.computation.jobs.expected,
                storeName = 'jobs';

            if (type === module.WORKER) {
                expected = project.computation.results.expected;
                storeName = 'results';
            }

            if (allFound(storeName, expected)) {
                // No need to create a pool if it's already complete
                logger.log('Computation', 'Already finished, not creating a ' + type + '-Pool!');
                return Q();
            }

            else {
                // Get the cached script from local fileSystem
                return storage.fs.getFileInfoByUri(url)
                    .then(function (fileInfos) {
                        return storage.fs.readFileAsObjectUrl(fileInfos[0]);
                    })
                    .then(function (objectURL) {

                        var amount = 1;

                        if (type === module.WORKER) {

                            if (project.computation.workers.multipleAllowed) {
                                amount = settings.maxWorkers;
                            }

                            module.workers = new Pool(module.WORKER, objectURL, amount);
                        }
                        else {

                            if (project.computation.factories.multipleAllowed) {
                                amount = settings.maxFactories;
                            }

                            module.factories = new Pool(module.FACTORY, objectURL, amount);
                        }

                    });
            }

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
                        if (module.workers) addEventListenersToPool(module.workers);
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

                return createThreadPool(module.FACTORY, project.computation.factories.url)
                    .then(function () {
                        if (module.factories)  addEventListenersToPool(module.factories);
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

            var job = new Job(e.data);

            // Add job to queue (if redundant it will be ignored)
            if (jobs.update(job)) {

                //logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'found a new job');
                module.emit('job:push', job);

                // Throw the job in the pool
                module.pushJobToAwaitingWorker(job);
            }

        }


        /**
         * Event-Listener, listens for
         * job:pull from Thread-Pool
         *
         * @private
         * @method poolJobRequiredHandler
         */
        function poolJobRequiredHandler(e) {

            var job;

            // Specific job?
            if (e.data && e.data.uuid) {

                logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a specific job');

                job = jobs.getJobByUuid(e.data.uuid);

                if (job) {
                    e.target.pushJob(job);
                }
            }

            // Use next job in queue
            else {

                //logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'needs a job');

                job = jobs.getNextAvailableJob();

                if (!job) {
                    //logger.log('Computation', 'No jobs left currently!');
                    // Mark the thread as idle
                    e.target.isIdle = true;

                    // There might no new jobs be added, or the workers pull for a new job
                    // so the workers would wait forever
                    _.delay(poolJobRequiredHandler, project.computation.results.noJobRetryTime, e);

                    return;
                }

                //logger.log('Computation', 'Pushing job!', job);

                // Send job to thread
                e.target.pushJob(job);

                // Need to lock job?
                if (project.computation.jobs.lock) {

                    //Lock job
                    jobs.lockJob(job);
                    module.emit('job:lock', {uuid: job.uuid});

                }
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

            var result = new Result(e.data);

            //logger.log('Thread (' + e.target.type + ' ' + e.target.id + ')', 'found a new result', result);

            // If validation not activated it is already valid
            if (!project.computation.results.validation.enabled) {
                result.isValid = true;
            }

            // Using Job-Locking?
            if (project.computation.jobs.lock && result.jobUuid) {

                // Unlock the job
                jobs.unlockJob({uuid: result.jobUuid});
                module.emit('job:unlock', {uuid: result.jobUuid});

            }

            // Nothing new, so return
            if (!results.update(result)) return;

            // Inform about new or changed result
            module.emit('result:push', result);

            // What about the job?
            if (project.computation.factories.enabled && result.jobUuid) {

                // If it's valid
                if (results.isValid(result)) {

                    // It's complete
                    jobs.markJobAsComplete({uuid: result.jobUuid});

                    // No need to wait for "callback", as caching will be fast enough
                    module.emit('job:push', jobs.getJobByUuid(result.jobUuid));

                }


            }


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

            // Get result from storage and push to thread
            e.target.pushResult(results.cache.get(e.data));

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

                    switch (e.data.type) {
                        case 'path' :
                            return project.uuid + '/' + fileInfo.uuid;
                            break;
                        case 'blob' :
                            return storage.fs.readFileChunkAsBlob(fileInfo, offset, completeFile);
                            break;
                        case 'dataUrl' :
                            return storage.fs.readFileChunkAsDataUrl(fileInfo, offset, completeFile);
                            break;
                        case 'localUrl' :
                            return storage.fs.readFileAsLocalUrl(fileInfo);
                            break;
                        default :
                        case 'arrayBuffer' :
                            return storage.fs.readFileChunkAsArrayBuffer(fileInfo, offset, completeFile);
                            break;
                    }

                }).then(function (file) {

                    // Transfer as transferable Object
                    if (e.data.type === 'arrayBuffer') {
                        e.target.pushFileAsTransferableObject(fileInfo, file)
                    }
                    // Transfer as clone (can get expensive!)
                    else {
                        e.target.pushFileAsClone(fileInfo, file)
                    }

                })


        }


        /**
         * @private
         * @method resultCounterCompleteHandler
         * @param e
         */
        function resultCounterCompleteHandler(e) {
            if (allFound('results', project.computation.results.expected)) {
                module.stopWorkers();
            }
        }

        /**
         * @private
         * @method jobCounterCompleteHandler
         * @param e
         */
        function jobCounterCompleteHandler(e) {
            if (allFound('jobs', project.computation.jobs.expected)) {
                module.stopFactories();
            }

        }


        /**
         * @private
         * @method counterCompleteHandler
         * @param e
         */
        function counterCompleteHandler(e) {
            if (module.isComplete()) {
                module.stop();
            }
            else {
                if (module.workers) {
                    if (allFound('results', project.computation.results.expected, true)) {
                        module.stopFactories();
                        module.stopWorkers();
                    }
                }
                if (module.factories) {
                    if (allFound('jobs', project.computation.jobs.expected, true)) {
                        module.stopFactories();
                    }
                }
            }

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

            stats: {
                startTime: null,
                endTime: null,
                duration: 0
            },

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

                results.cache.syncWithStorage()
                    .then(jobs.cache.syncWithStorage)
                    .then(createFactories)
                    .then(createWorkers)
                    .then(function () {

                        // Nothing to do
                        if (!module.workers && !module.factories) {
                            return;
                        }

                        // Start the factories if disabled, won't do anyhting
                        if (module.factories) {
                            jobs.cache.enableAutoSave();
                            module.factories.start();
                            jobCountTimer = window.setInterval(jobCounterCompleteHandler, project.computation.jobs.testIntervalTime);
                        }

                        // Start the workers, same as factories
                        if (module.workers) {
                            results.cache.enableAutoSave();
                            module.workers.start();
                            resultCountTimer = window.setInterval(resultCounterCompleteHandler, project.computation.results.testIntervalTime);
                        }

                        // Timestamp for performance measuring
                        module.stats.startTime = Date.now();

                        // Starting global timer
                        countTimer = window.setInterval(counterCompleteHandler, project.computation.testIntervalTime);

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

                logger.log('Computation', 'Stopping');

                module.stopWorkers();
                module.stopFactories();

                // Performance stats
                module.stats.endTime = Date.now();
                module.stats.duration = module.stats.endTime - module.stats.startTime;

                logger.log('Computation', 'Runtime was', module.stats.duration / 1000, 'seconds');

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
                    // Save and clear cache
                    results.cache.disableAutoSave();
                    results.cache.save().then(results.cache.flush);

                    // Stop autosaving of jobs
                    jobs.cache.disableAutoSave();
                    jobs.cache.save().then(jobs.cache.flush);

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
                    // Save, cache and autosaving must be kept!
                    jobs.cache.save();
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
                return allFound('results', project.computation.results.expected)
                    && allFound('jobs', project.computation.jobs.expected);
            },


            /**
             * @method pushJobToAwaitingWorker
             * @returns {Array}
             */
            pushJobToAwaitingWorker: function (job) {

                // Are there workers at all?
                if (!module.workers) return;

                var workers = module.workers.getIdleThreads();

                if (workers.length > 0) {

                    // Need to publish lock?
                    if (project.computation.jobs.lock) {

                        jobs.lockJob(job);

                        module.emit('job:lock', {uuid: job.uuid});

                        workers[0].pushJob(job);
                    }
                    // No need to lock
                    else {
                        workers[0].pushJob(job);
                    }

                }
            }

        });

    }

)
;