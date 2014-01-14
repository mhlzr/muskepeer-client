define(['crypto/index', 'settings'], function (crypto, settings) {

    /**
     * @class Result
     * @constructor
     * @param {Object} data
     */
    return function Result(data) {

        this.data = data.result;
        this.uuid = crypto.hash(data);

        this.peerUuid = settings.uuid;

        if (data.job) {
            this.jobUuid = data.job.uuid;
        }

        this.iteration = 1;
        this.timestamp = Date.now();

        this.isValid = false;
    };
});