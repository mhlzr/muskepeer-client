/**
 * External Storage Service to store result data to
 * a service using HTTP and XHR.
 * Tested for parse.com
 *
 * @module StorageService
 * @class storageService
 */

define([], function () {

    return function StorageService(options) {

        this.url = options.url;
        this.type = options.type;
        this.params = options.params;
        this.headers = options.headers;

        function serialize(mapping) {
            var values = [];

            for (var key in mapping) {
                if (mapping.hasOwnProperty(key)) {
                    values.push(key + '=' + mapping[key])
                }
            }

            return values.join('&');
        }

        this.save = function (data) {

            var xhr = new XMLHttpRequest();

            xhr.open('POST', this.url + serialize(this.params), true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            this.headers.forEach(function (header) {
                xhr.setRequestHeader(header.key, header.value);
            });

            xhr.send(JSON.stringify(data));

        }
    };
});