/**
 *
 * @module Computation
 * @class Computation
 * @extends MuskepeerModule
 */

define(['muskepeer-module', '../storage/index', '../network/index', '../project', './collection/workers', 'crypto/index', './collection/jobs', './model/job', '../storage/model/storageService'], function (MuskepeerModule, storage, network, project, workers, crypto, jobs, Job, StorageService) {

    var module = new MuskepeerModule(),
        externalStorageServices = [];


    /**
     * @private
     * @method createWorkers
     */
    function createWorkers() {

        // Already initiated?
        if (workers.size !== 0) return;

        // Get the cached worker-script from local fileSystem
        return  storage.fs.getFileInfoByUri(project.computation.workerUrl)
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
    function jobFactoryErrorHandler() {
        logger.error('JobFactory', 'an error occured');
    }

    /**
     * @private
     * @method workerResultRequiredHandler
     */
    function workerResultRequiredHandler() {
    }

    /**
     * @private
     * @method workerJobRequiredHandler
     */
    function workerJobRequiredHandler() {
        logger.log('Worker ' + id, 'needs job');
        //workers.getWorkerById(id).process({foo: 'bar'});
    }

    /**
     * @private
     * @method workerResultFoundHandler
     */
    function workerResultFoundHandler(data) {
        var isNew = true,
            result = {
                iteration: 0,
                local: true,
                uuid: crypto.hash(data.result),
                data: data.result
            };

        logger.log('Worker ' + data.id, 'has result', result.uuid);

        // Already existent?
        storage.db.read('results', result.uuid, {uuidIsHash: true})
            .then(function (resultInStorage) {
                if (resultInStorage) {
                    isNew = false;
                    result.iteration = resultInStorage.iteration++;
                }
            })
            .then(function () {

                // Store result to local database
                storage.db.save('results', result, {uuidIsHash: true});

                // Send to externalStorages
                externalStorageServices.forEach(function (service) {
                    service.save(result);
                });

                //Broadcast if new || mutipleIterations
                network.peers.broadcast('result', result);

            })
    }

    /**
     * @private
     * @method workerFileFoundHandler
     */
    function workerFileFoundHandler() {

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

            // Create external storage services
            if (project.computation.storages && project.computation.storages.length > 0) {
                project.computation.storages.forEach(function (settings) {
                    if (!settings.enabled) return;
                    externalStorageServices.push(new StorageService(settings));
                });

                logger.log('Computation', 'ExternalStorages registered');
            }


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
});