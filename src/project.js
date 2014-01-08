/**
 * @class Project
 */

define(['q', 'lodash'], function (Q, _) {

    // Defaults
    var defaults = {

        "active": true,

        "computation": {

            "offlineAllowed": true,

            "resultGroupSize": 1, //how much results to collect before broadcast
            "validationIterations": 0, //-1 : Inifinite, 0 : None; >0 : Amount

            "useJobList": false, //create and store jobs from worker
            "jobGroupSize": 1 //how much jobs to create before broadcast


        },

        "network": {
            "useGeoLocation": true,
            "services": []

        },

        "files": []};


    function isValidUrl(url) {
        //TODO
        return true;
    }


    function downloadJSON(url) {
        //TODO
    }

    function combineWithDefaults(project) {
        // Combine passed project settings with defaults
        return _.defaults(project, defaults);
    }

    return {
        create: function (config) {

            var deferred = Q.defer();

            if (_.isObject(config)) {
                _.extend(this, combineWithDefaults(config));
                deferred.resolve();
            }
            else if (_.isString(config) && isValidUrl(config)) {
                downloadJSON().then(function (config) {
                    _.extend(this, combineWithDefaults(config));
                    deferred.resolve();
                })
            }


            return deferred.promise;

        }
    }
});