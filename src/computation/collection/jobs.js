/**
 * @class Jobs
 * @module Jobs
 */


define(['q', 'storage/index', 'project', 'storage/model/cache'], function (Q, storage, project, Cache) {


    var module = {};


    /**
     * @method init
     */
    module.init = function () {

        module.cache = new Cache('jobs', project.computation.jobs.autoSaveIntervalTime, function (a, b) {
            return (a && b) && (a.isComplete !== b.isComplete || a.isLocked !== b.isLocked);
        });

    };


    /**
     * Cache-list of all jobs
     *
     * @property cache
     * @type {Number}
     */
    module.cache = null;


    /**
     * Will return true if the job was added, false it wasn't.
     *
     * @method update
     * @param {Job} job
     * @return {Promise}
     */
    module.update = function (job) {
        return module.cache.set(job);
    };

    /**
     * @method clear
     * @return {Promise}
     */
    module.clear = function () {
        module.cache.flush();
        return storage.db.clear(['jobs']);
    };


    /**
     * @method getNextAvailableJob
     * @returns {}
     */
    module.getNextAvailableJob = function () {

        // Use cache, remove locked and solved from list
        var jobs = module.cache.filter(function (job) {
            return !job.isComplete && !job.isLocked;
        });

        // Jobs left?
        if (jobs.length > 0) {
            return jobs[(Math.random() * jobs.length) | 0];
        }

    };

    /**
     * @method getJobByUuid
     * @param {String} uuid
     * @return {Promise}
     */
    module.getJobByUuid = function (uuid) {
        return module.cache.get({uuid: uuid});
    };


    /**
     * @method lockJob
     * @param {Job} job
     */
    module.lockJob = function (job) {

        if (project.computation.jobs.lock) {
            module.cache.set({uuid: job.uuid, locktime: Date.now(), isLocked: true});
        }

    };

    /**
     * @method unlockJob
     * @param {Job} job
     */
    module.unlockJob = function (job) {

        if (project.computation.jobs.lock) {
            module.cache.set({uuid: job.uuid, locktime: null, isLocked: false});
        }

    };

    /**
     * @method markJobAsComplete
     * @param {Job} job
     */
    module.markJobAsComplete = function (job) {
        module.cache.set({uuid: job.uuid, isComplete: true, isLocked: false});
    };


    return module;

});
