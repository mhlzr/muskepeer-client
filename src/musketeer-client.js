/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

define([
    'lodash',
    './computation/index',
    './crypto/index',
    './network/index',
    './project',
    './settings',
    './states',
    './storage/index'
], function (_, computation, crypto, network, project, settings, states, storage) {

    "use strict";

    function browserFitsRequirements() {
        return JSON && localStorage && Object.observe && indexedDB && navigator.geolocation;
    }

    var musketeer = {

        computation: computation,
        crypto: crypto,
        network: network,
        project: project,
        settings: settings,
        states: states,
        storage: storage,

        /**
         * Initiate Musketeer
         * Tests if browser-requirements are fulfilled.
         * @returns {musketeer}
         */
        init: function () {

            if (!browserFitsRequirements()) {
                throw new Error('Your browser does not fit the requirements');
            }

            /*
             //detect geoLocation if needed
             if (project.network.useGeoLocation) {
             geolocation.getGeoLocation().then(function (location) {
             _self.location = location;
             });
             }
             */

            return musketeer;
        },
        /**
         * Start Musketeer
         * @param config Configuration-Object
         * @returns {musketeer}
         */
        start: function (config) {

            if (config) {
                musketeer.config = config;
            }

            //storage is initialized async,
            //if not yet read, we wait for the event
            if (!storage.isReady) {
                storage.on('ready', musketeer.start);
                return this;
            }
            else {
                storage.off('ready', musketeer.start);
            }

            //combine project settings with defaults
            project = _.defaults(project, musketeer.config.project);

            //store node configuration
            storage.saveMultiple('nodes', musketeer.config.nodes)
                .then(function () {
                    network.start();
                    computation.start();
                });


            return musketeer;
        },

        /**
         * Stop Musketeer
         */
        stop: function () {
            musketeer.computation.stop();
            musketeer.network.stop();
            return musketeer;

        }


    };

    return musketeer;

});