/**
 * @class Jobs
 * @module Jobs
 */


define(['q', 'storage/index', 'project'], function (Q, storage, project) {


    var module = {},
        cacheIsInSync = false;

    /**
     * @private
     * @method getJobsFromStorage
     * @param {Boolean} filterFinished
     * @param {Boolean} filterLocked
     * @return {Promise}
     */
    function getJobsFromStorage(filterFinished, filterLocked) {

        filterFinished = filterFinished || false;
        filterLocked = filterLocked || false;

        var filter = {
            projectUuid: project.uuid
        };

        if (filterFinished) {
            filter.isComplete = false;
        }

        if (filterLocked) {
            filter.isLocked = false;
        }

        return storage.db.findAndReduceByObject('jobs', {filterDuplicates: false}, filter);


    }

    /**
     * @property size
     * @type {Number}
     */
    module.size = 0;


    /**
     * Cache-list of all jobs
     *
     * @property cache
     * @type {Number}
     */
    module.cache = [];


    /**
     * Cache-list of locked jobs
     *
     * @property lockList
     * @type {Array}
     */
    module.lockList = [];


    /**
     * Cache-list of complete jobs
     *
     * @property completeList
     * @type {Array}
     */
    module.completeList = [];


    /**
     * Read all results from storage and save hashs to cache
     *
     * @method fillCache
     * @return {Promise}
     */
    module.fillCache = function () {
        var deferred = Q.defer();

        if (cacheIsInSync) {
            deferred.resolve(true);
        }
        else {
            getJobsFromStorage().then(function (jobs) {

                jobs.forEach(function (job) {

                    module.cache.push(job.uuid);

                    if (job.isComplete) {
                        module.completeList.push(job.uuid);
                    }

                    if (job.isLocked) {
                        module.lockList.push(job.uuid);
                    }

                });

                module.size = jobs.length;
                cacheIsInSync = true;
                deferred.resolve(true);
            })
        }
        return deferred.promise;
    };


    /**
     * Wiil return true if the job was added, false it wasn't.
     *
     * @method add
     * @param {Job} job
     * @return {Promise}
     */
    module.add = function (job) {

        // Valid job?
        // We need some buffer db i/o
        // is quite slow
        if (!job.uuid || module.cache.indexOf(job.uuid) >= 0) {
            var deferred = Q.defer();
            deferred.resolve(false);
            return deferred.promise;
        }


        else {

            module.cache.push(job.uuid);

            if (module.cache.length > project.computation.jobs.cacheSize) {
                module.cache = [];
            }

            return storage.db.has('jobs', job.uuid, {uuidIsHash: true})
                .then(function (exists) {
                    if (exists) {
                        // Not new, but finished
                        if (job.isComplete) {
                            return module.markJobAsComplete(job)
                                .then(function () {
                                    return true;
                                })
                        }
                        // Not new, not finished
                        else {
                            return false;
                        }

                    }
                    // Store
                    return storage.db.save('jobs', job, {uuidIsHash: true});
                })
                .then(function () {
                    return true;
                });
        }

    };

    /**
     * @method clear
     * @return {Promise}
     */
    module.clear = function () {
        return storage.db.clear(['jobs']);
    };


    /**
     * @method getNextAvailableJob
     * @returns {}
     */
    module.getNextAvailableJob = function () {
        var deferred = Q.defer(),
            position;

        // Use cache, remove locked and solved from list
        var jobs = _.difference(module.cache, module.lockList, module.completeList);

        // Jobs left?
        if (jobs.length > 0) {
            position = (Math.random() * jobs.length) | 0;

            module.getJobByUuid(jobs[position]).then(function (job) {
                deferred.resolve(job);
            });

        }

        // Use storage
        else {

            getJobsFromStorage(true, true).then(function (jobs) {

                if (jobs.length > 0) {
                    // We don't take the first, but any random one!
                    position = (Math.random() * jobs.length) | 0;
                    deferred.resolve(jobs[position]);
                }
                else {
                    deferred.resolve(null);
                }
            });


        }
        return deferred.promise;

    };

    /**
     * @method getJobByUuid
     * @param {String} uuid
     * @return {Promise}
     */
    module.getJobByUuid = function (uuid) {
        return storage.db.read('jobs', uuid, {uuidIsHash: true});
    };


    /**
     * @method lockJob
     * @param {Job} job
     * @return {Promise}
     */
    module.lockJob = function (job) {
        if (project.computation.jobs.lock) {
            module.lockList.push(job.uuid);
            return storage.db.update('jobs', {uuid: job.uuid, locktime: Date.now(), isLocked: true}, {uuidIsHash: true});
        }
        else return Q();
    };

    /**
     * @method unlockJob
     * @param {Job} job
     * @return {Promise}
     */
    module.unlockJob = function (job) {
        if (project.computation.jobs.lock) {
            // Removwe from list
            module.lockList.splice(module.lockList.indexOf(job.uuid), 1);

            return storage.db.update('jobs', {uuid: job.uuid, locktime: null, isLocked: false}, {uuidIsHash: true});
        }
        else return Q();
    };

    /**
     * @method markJobAsComplete
     * @param {Job} job
     * @return {Promise}
     */
    module.markJobAsComplete = function (job) {
        module.completeList.push(job.uuid);
        return storage.db.update('jobs', {uuid: job.uuid, isComplete: true}, {uuidIsHash: true})
    };

    /**
     * @method remove
     * @param {Job} job
     * @return {Promise}
     */
    module.remove = function (job) {
        return storage.db.remove('jobs', job.uuid);
    };


    return module;

});
