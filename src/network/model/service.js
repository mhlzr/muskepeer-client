/**
 *
 * @module Network
 *
 */

define([], function () {

    /**
     * External  Service to store result data to
     * a service using HTTP and XHR.
     * Tested for parse.com
     *
     * @class Service
     * @constructor
     *
     * @param {Object} options
     */

    return function Service(options) {

        this.id = options.id;
        this.url = options.url;
        this.type = options.type;
        this.params = options.params;
        this.headers = options.headers;

        /**
         * @private
         * @method serialize
         * @param {Object} mapping
         * @return {String}
         */
        function serialize(mapping) {
            var values = [];

            for (var key in mapping) {
                if (mapping.hasOwnProperty(key)) {
                    values.push(key + '=' + mapping[key])
                }
            }

            return values.join('&');
        }

        /**
         * @method save
         * @param data
         */
        this.save = function (data) {

            var xhr = new XMLHttpRequest();

            xhr.open('POST', this.url + serialize(this.params), true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            this.headers.forEach(function (header) {
                xhr.setRequestHeader(header.key, header.value);
            });

            xhr.send(JSON.stringify(data));

            logger.log('Service ' + this.id, 'sending.');

        };

    };
});