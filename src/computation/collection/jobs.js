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

        module.cache = new Cache('jobs', project.computation.jobs.autoSaveIntervalTime);

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

        return null;

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
            job.locktime = Date.now();
            job.isLocked = true;
            module.cache.set(job);
        }

    };

    /**
     * @method unlockJob
     * @param {Job} job
     */
    module.unlockJob = function (job) {

        if (project.computation.jobs.lock) {
            job.locktime = null;
            job.isLocked = false;
            module.cache.set(job);
        }

    };

    /**
     * @method markJobAsComplete
     * @param {Job} job
     */
    module.markJobAsComplete = function (job) {

        job.isComplete = true;
        job.isLocked = false;
        module.cache.set(job);
    };


    return module;

});
