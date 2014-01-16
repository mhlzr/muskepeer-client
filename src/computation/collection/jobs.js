/**
 * @class Jobs
 * @module Jobs
 */


define(['q', 'storage/index', 'project'], function (Q, storage, project) {

    var module = {};

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
            filter.isFinished = false;
        }

        if (filterLocked) {
            filter.isLocked = false;
        }

        return storage.db.findAndReduceByObject('jobs', {filterDuplicates: false}, filter);


    }


    /**
     * Wiil return true if the job was added, false it wasn't.
     *
     * @method add
     * @param {Job} job
     * @return {Promise}
     */
    module.add = function (job) {

        //Valid job?
        if (!job.uuid) return null;

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
            // And update list
            .then(getJobsFromStorage)
            .then(function () {
                return true;
            });


    };

    /**
     * @method clear
     * @return {Promise}
     */
    module.clear = function () {
        return storage.db.clear(['jobs']).then(getJobsFromStorage);
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
                // We do'nt take the first, but any random one!
                //deferred.resolve(jobs.shift());
                position = (Math.random() * jobs.length | 0);
                deferred.resolve(jobs.splice(position, 1));
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
            return storage.db.update('jobs', {uuid: job.uuid, locktime: Date.now(), isLocked: true}, {uuidIsHash: true}).then(getJobsFromStorage);
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
            return storage.db.update('jobs', {uuid: job.uuid, locktime: null, isLocked: false}, {uuidIsHash: true}).then(getJobsFromStorage);
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
            .then(getJobsFromStorage);
    };

    /**
     * @method remove
     * @param {Job} job
     * @return {Promise}
     */
    module.remove = function (job) {
        return storage.db.remove('jobs', job.uuid).then(getJobsFromStorage);
    };


    return module;


});
