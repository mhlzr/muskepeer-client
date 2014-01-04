/**
 * Created by Matthieu Holzer on 15.10.13.
 */
define(['crypto/index'], function (crypto) {

    return function Job(parameters) {

        this.parameters = parameters;
        this.uuid = crypto.hash(this.parameters);

        return this;
    };
});