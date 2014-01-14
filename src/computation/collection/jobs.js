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
     * @method add
     * @param {Job} job
     * @return {Promise}
     */
    module.add = function (job) {

        //Valid job?
        if (!job.uuid) return null;

        return module.getJobByUuid(job.uuid)
            .then(function (result) {
                // Already got this one?
                if (result) return null;
            })
            // Save job to storage
            .then(function () {
                return storage.db.save('jobs', job, {uuidIsHash: true});
            })
            // And update list
            .then(getJobsFromStorage);


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
        if (project.computation.jobs.lockJobsWhileSolving) {
            return storage.db.update('jobs', {uuid: job.uuid, locktime: Date.now(), isLocked: true}, {uuidIsHash: true}).then(getJobsFromStorage);
        }
        else return null;
    };

    /**
     * @method unlockJob
     * @param {Job} job
     * @return {Promise}
     */
    module.unlockJob = function (job) {
        if (project.computation.jobs.lockJobsWhileSolving) {
            return storage.db.update('jobs', {uuid: job.uuid, locktime: null, isLocked: false}, {uuidIsHash: true}).then(getJobsFromStorage);
        }
        else return null;
    };

    /**
     * @method markJobAsFinished
     * @param {Job} job
     * @return {Promise}
     */
    module.markJobAsFinished = function (job) {
        return storage.db.update('jobs', {uuid: job.uuid, isFinished: true}, {uuidIsHash: true}).then(getJobsFromStorage);
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
