define(['crypto/index', 'settings'], function (crypto, settings) {

    /**
     * @class Result
     * @constructor
     * @param {Object} data
     */
    return function Result(data) {

        // If this result is related to a job,
        // we add the jobUuid as salt, as it is possible
        // that two jobs, have the same results
        if (data.job && data.job.uuid) {
            this.jobUuid = data.job.uuid;
            this.uuid = crypto.hash({result: data.result, jobUuid: data.job.uuid});
        }
        // Seems as if there are no jobs associated
        else {
            this.uuid = crypto.hash(data.result);
        }

        this.data = data.result;

        this.peerUuid = settings.uuid;

        this.iteration = 1;
        this.timestamp = Date.now();

        this.isValid = false;
    };
});