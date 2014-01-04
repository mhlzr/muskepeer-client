/**
 *
 *
 * @module result
 * @class result
 */

define([], function () {
    return function Result(parameters) {
        this.parameters = parameters;
        this.uuid = crypto.hash(this.parameters);
    };
});