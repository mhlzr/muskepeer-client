/**
 * @class Job
 */
define(['crypto/index', 'settings'], function (crypto, settings) {

    return function Job(parameters) {

        this.isLocked = false;
        this.isFinished = false;

        this.parameters = parameters;
        this.uuid = crypto.hash(this.parameters);

        this.peerUuid = settings.uuid;

        return this;
    };
});