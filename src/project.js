/**
 * Represents the current project
 *
 * @module Project
 * @class Project
 */

define(['q', 'lodash', 'mixing'], function (Q, _, mixing) {

    /**
     * Defaults project-settings
     *
     * @private
     * @property defaults
     * @type {Object}
     *
     * */
    var defaults = {

        "active": true,

        "computation": {

            "offlineAllowed": true,
            "testIntervalTime": 30000,

            "workers": {
                "enabled": false,
                "multipleAllowed": true
            },

            "factories": {
                "enabled": false,
                "multipleAllowed": true
            },

            "results": {
                "cacheSize": 10000,
                "groupSize": 1,
                "validation": {
                    "enabled": false,
                    "iterations": 1
                },
                "noJobRetryTime": 10000,
                "expected": -1,
                "testIntervalTime": 10000
            },

            "jobs": {
                "cacheSize": 10000,
                "lock": true,
                "maxLockTime": 3600000,
                "groupSize": 1,
                "expected": -1,
                "testIntervalTime": 10000
            }
        },

        "network": {

            "broadcast": {
                "results": {
                    "enabled": true,
                    "groupSize": 1
                },
                "jobs": {
                    "enabled": true,
                    "groupSize": 1
                },
                "files": {
                    "enabled": false,
                    "groupSize": 1
                },
                "peers": {
                    "enabled": true,
                    "groupSize": 1
                },
                "nodes": {
                    "enabled": true,
                    "groupSize": 1
                }
            },

            "synchronization": {
                "results": {
                    "enabled": true,
                    "interval": 3600000,
                    "groupSize": 15
                },
                "jobs": {
                    "enabled": true,
                    "interval": 3600000,
                    "groupSize": 15
                },
                "files": {
                    "enabled": false,
                    "interval": 3600000,
                    "groupSize": 1
                },
                "peers": {
                    "enabled": true,
                    "interval": 3600000,
                    "groupSize": 15
                },
                "nodes": {
                    "enabled": true,
                    "interval": 3600000,
                    "groupSize": 15
                }
            },

            "useGeoLocation": true,

            "services": []
        },

        "files": []
    };


    /**
     * @private
     * @method isValidUrl
     * @param url
     * @returns {Boolean}
     */
    function isValidUrl(url) {
        // I think that's sufficient currently
        return new RegExp(/http(s)?/gi).test(url);
    }


    /**
     * @private
     * @method downloadJSON
     * @param url {String}
     * @return {Promise}
     */
    function downloadJSON(url) {
        var deferred = Q.defer();

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.timeout = 10000;


        xhr.addEventListener('load', function (e) {
            if (xhr.status === 200) {
                deferred.resolve(e.target.response);
            } else {
                deferred.reject('Error downloading project-file');
            }
        }, false);


        xhr.addEventListener('timeout', function (e) {
            deferred.reject('Timeout downloading project-file');
        }, false);


        xhr.send();

        return deferred.promise;
    }

    /**
     * Combines passed project settings with defaults
     *
     * @private
     * @method combineWithDefaults
     * @param {Object} project
     * @return {Object}
     */
    function combineWithDefaults(project) {
        return mixing(project, defaults, {
            overwrite: false,
            recursive: true
        });
    }

    return {

        /**
         * Create project from object or url
         *
         * @method create
         * @param {Object|String} config Object or url of json-file
         * @return {Promise}
         */
        create: function (config) {

            var self = this,
                deferred = Q.defer();

            if (_.isObject(config)) {
                _.extend(this, combineWithDefaults(config));
                deferred.resolve();
            }
            else if (_.isString(config) && isValidUrl(config)) {

                logger.log('Project', 'Downloading settings from', config);

                downloadJSON(config)
                    .then(function (config) {
                        _.extend(self, combineWithDefaults(config));
                        deferred.resolve();
                    })
            }
            else {
                logger.error('Project', 'Configuration neither object nor valid url');
            }


            return deferred.promise;

        }
    }
});