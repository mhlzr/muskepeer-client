/**
 * Created by Matthieu Holzer on 15.10.13.
 */
define(['crypto/index'], function (crypto) {

    return function Job(data) {

        this.uuid = this.getParamsAsHash();

        this.getParams = function () {
            return data.params;
        };

        this.getParamsAsHash = function () {
            return crypto.hash(this.getParams())
        };
    };
});