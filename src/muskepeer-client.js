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
        //Object.observe is handled via observe-js, as too many browser yet don't support it
        return !!JSON && !!localStorage && !!indexedDB && !!navigator.geolocation;
    }

    var muskepeer = {

        computation: computation,
        crypto: crypto,
        network: network,
        project: project,
        settings: settings,
        states: states,
        storage: storage,

        /**
         * Initiate muskepeer
         * Tests if browser-requirements are fulfilled.
         * @returns {muskepeer}
         */
        init: function () {

            if (!browserFitsRequirements()) {
                throw new Error('Your browser does not fit the requirements');
            }

            return muskepeer;
        },
        /**
         * Start muskepeer
         * @param config Configuration-Object
         * @returns {muskepeer}
         */
        start: function (config) {

            if (config) {
                muskepeer.config = config;
            }

            //storage is initialized async,
            //if not yet read, we wait for the event
            if (!storage.isReady) {
                storage.on('ready', muskepeer.start);
                return this;
            }
            else {
                storage.off('ready', muskepeer.start);
            }

            //combine project settings with defaults
            project = _.defaults(project, muskepeer.config.project);

            //store node configuration
            storage.saveMultiple('nodes', muskepeer.config.nodes, {allowDuplicates: false})
                .then(function () {
                    network.start();
                    computation.start();
                });


            return muskepeer;
        },

        /**
         * Stop muskepeer
         */
        stop: function () {
            muskepeer.computation.stop();
            muskepeer.network.stop();
            return muskepeer;

        }


    };

    return muskepeer;

});