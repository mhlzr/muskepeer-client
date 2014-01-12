/**
 * @class Project
 */

define(['q', 'lodash'], function (Q, _) {

    // Defaults
    var defaults = {

        "active": true,

        "computation": {

            "offlineAllowed": true,

            "solving": {
                "enabled": true,
                "multipleAllowed": true,
                "validation": {
                    "enabled": false,
                    "iterations": 0
                }
            },

            "jobs": {
                "enabled": false,
                "lockJobsWhileSolving": true,
                "maxLockTime": 3600000,
                "groupSize": 1
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
                    "groupSize": 15
                },
                "jobs": {
                    "enabled": true,
                    "groupSize": 15
                },
                "files": {
                    "enabled": false,
                    "groupSize": 1
                },
                "peers": {
                    "enabled": true,
                    "groupSize": 15
                },
                "nodes": {
                    "enabled": true,
                    "groupSize": 15
                }
            },

            "useGeoLocation": true,

            "services": []
        },

        "files": []
    };


    function isValidUrl(url) {
        // I think that's sufficient
        return new RegExp(/http(s)?/gi).test(url);
    }


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
     * @returns {Object}
     */
    function combineWithDefaults(project) {
        return _.defaults(project, defaults);
    }

    return {
        create: function (config) {

            var self = this,
                deferred = Q.defer();

            if (_.isObject(config)) {
                _.extend(this, combineWithDefaults(config));
                deferred.resolve();
            }
            else if (_.isString(config) && isValidUrl(config)) {

                logger.log('Project', 'Downloading settings');

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