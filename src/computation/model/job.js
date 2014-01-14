define(['crypto/index', 'settings'], function (crypto, settings) {


    /**
     * @class Job
     * @constructor
     * @param {Object} parameters
     */
    return function Job(parameters) {

        this.isLocked = false;
        this.isComplete = false;

        this.parameters = parameters;
        this.uuid = crypto.hash(this.parameters);

        this.peerUuid = settings.uuid;

        return this;
    };
});