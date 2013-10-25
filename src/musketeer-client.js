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


        /**
         * Initiate Musketeer
         * Tests if browser-requirements are fulfilled.
         * @returns {musketeer}
         */
        init: function () {

            if (!browserFitsRequirements()) {
                throw new Error('Your browser does not fit the requirements');
            }

            return this;
        },
        /**
         * Starts als modules
         * @param config Configuration-Object
         * @returns {musketeer}
         */
        start: function (config) {

            //combine project settings with defaults
            project = _.defaults(project, config.project);

            network.start(config.nodes);

            computation.start();

            return this;
        },

        computation: computation,
        crypto: crypto,
        network: network,
        project: project,
        settings: settings,
        states: states,
        storage: storage

    };


    musketeer.computation.on('task:start', function (e) {
        console.log('start');
    });


    musketeer.network.on('node:connected', function (e) {
        console.log('node:connected');
    });

    musketeer.network.on('node:disconnected', function (e) {
        console.log('node:disconnected');
    });

    musketeer.network.on('p2p:connected', function (e) {
        console.log('p2p:connected');
    });

    musketeer.network.on('p2p:disconnected', function (e) {
        console.log('p2p:disconnected');
    });


    return musketeer;

});