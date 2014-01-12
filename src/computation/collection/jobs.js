/**
 * @class Jobs
 * @module Jobs
 */


define(['q', 'storage/index', 'project'], function (Q, storage, project) {

    var module = {};

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


    module.add = function (job) {

        //Valid job?
        if (!job.uuid) return null;

        module.getJobByUuid(job.uuid)
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

    module.clear = function () {
        return storage.db.clear(['jobs']).then(getJobsFromStorage);
    };


    module.getNextAvailableJob = function () {
        var deferred = Q.defer();

        getJobsFromStorage(true, true).then(function (jobs) {
            if (jobs.length > 0) {
                deferred.resolve(jobs.shift());
            }
            else {
                deferred.resolve(null);
            }
        });

        return deferred.promise;

    };

    module.getJobByUuid = function (uuid) {
        return storage.db.read('jobs', uuid, {uuidIsHash: true});
    };


    module.lockJob = function (job) {
        if (project.computation.jobs.lockJobsWhileSolving) {
            return storage.db.update('jobs', {uuid: job.uuid, locktime: Date.now(), isLocked: true}, {uuidIsHash: true}).then(getJobsFromStorage);
        }
        else return null;
    };

    module.unlockJob = function (job) {
        if (project.computation.jobs.lockJobsWhileSolving) {
            return storage.db.update('jobs', {uuid: job.uuid, locktime: null, isLocked: false}, {uuidIsHash: true}).then(getJobsFromStorage);
        }
        else return null;
    };

    module.markJobAsFinished = function (job) {
        return storage.db.update('jobs', {uuid: job.uuid, isFinished: true}, {uuidIsHash: true}).then(getJobsFromStorage);
    };

    module.remove = function (job) {
        return storage.db.remove('jobs', job.uuid).then(getJobsFromStorage);
    };


    return module;


});
