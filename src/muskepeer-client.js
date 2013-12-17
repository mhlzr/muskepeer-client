/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 * @module Muskepeer-Client
 * @class Muskepeer-Client
 */

define([
    'lodash',
    './computation/index',
    './crypto/index',
    './network/index',
    './project',
    './settings',
    './storage/index'
], function (_, computation, crypto, network, project, settings, storage) {

    "use strict";

    /**
     * @private
     * @method deviceHasRequiredFeatures
     * @returns {boolean}
     */
    function deviceHasRequiredFeatures() {
        //Object.observe is handled via observe-js, as too many browser yet don't support it
        return !!JSON && !!localStorage && !!indexedDB && !!navigator.geolocation && !!(window.mozRTCPeerConnection || window.webkitRTCPeerConnection || RTCPeerConnection);
    }

    var module = {

        computation: computation,
        crypto: crypto,
        network: network,
        project: project,
        settings: settings,
        storage: storage,

        /**
         * Initiate muskepeer
         * @method init
         * @chainable
         * @return {Object}
         */
        init: function () {

            if (!deviceHasRequiredFeatures()) {
                throw new Error('Your browser is not supported.');
            }

            return module;
        },
        /**
         * Start muskepeer
         * @method start
         * @chainable
         * @param config Configuration-Object
         * @returns {Object}
         */
        start: function (config) {

            // Store configuration
            module.config = config;

            // Combine project settings with defaults
            project = _.defaults(project, module.config.project);

            // Initialize storage module
            storage.init()
                .then(function () {
                    // Store node configuration
                    return storage.db.saveMultiple('nodes', module.config.nodes, {allowDuplicates: false})
                })
                .then(function () {
                    //network.start();
                    //computation.start();


                    //TESTING
                    storage.files.add(project.files)
                        .then(function () {
                            return storage.files.download();
                        })
                        .then(function () {
                            logger.log('DONE!');
                        });

                });

            return module;
        },

        /**
         * Stop muskepeer
         * @method stop
         * @chainable
         */
        stop: function () {
            module.computation.stop();
            module.network.stop();
            return module;

        }


    };

    return module;

});