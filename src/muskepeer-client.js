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

            if (config) {
                module.config = config;
            }

            //storage is initialized async,
            //if not yet read, we wait for the event
            if (!storage.isReady) {
                storage.on('ready', module.start);
                return this;
            }
            else {
                storage.off('ready', module.start);
            }

            //combine project settings with defaults
            project = _.defaults(project, module.config.project);


            //store node configuration
            storage.saveMultiple('nodes', module.config.nodes, {allowDuplicates: false})
                .then(function () {
                    network.start();
                    //computation.start();
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