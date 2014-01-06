/**
 * @class Job
 */
define(['crypto/index'], function (crypto) {

    return function Job(parameters) {

        this.parameters = parameters;
        this.uuid = crypto.hash(this.parameters);

        return this;
    };
});