/**
 *
 * @class Result
 */

define(['crypto/index'], function (crypto) {
    return function Result(data) {
        this.data = data;
        this.uuid = crypto.hash(this.data);
        this.iteration = 1;
        this.timestamp = Date.now();
    };
});