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
     * @property cache
     * @type {Number}
     */
    module.cache = [];


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
        if (!job.uuid || hashs.indexOf(job.uuid) >= 0) {
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

        getJobsFromStorage(true, true).then(function (jobs) {

            if (jobs.length > 0) {
                // We don't take the first, but any random one!
                //deferred.resolve(jobs.shift());
                position = (Math.random() * jobs.length | 0);
                var job = jobs.splice(position, 1)[0];
                deferred.resolve(job);
            }
            else {
                deferred.resolve(null);
            }
        });

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
