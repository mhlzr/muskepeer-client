/**
 * @author Matthieu Holzer
 * @version 0.1
 * @module MuskepeerClient
 * @class MuskepeerClient
 */

define([
    'q',
    'lodash',
    'computation/index',
    'crypto/index',
    'grid',
    'network/index',
    'project',
    'settings',
    'storage/index',
    'mediator'
], function (Q, _, computation, crypto, grid, network, project, settings, storage, mediator) {

    'use strict';

    /**
     * Simple feature testing of the application requirements
     * as a lot of the used technologies are still working drafts
     * and for from standard
     *
     * @private
     * @method getDeviceCapabilities
     * @return {Object}
     */
    function getDeviceCapabilities() {
        var requirements = [
                { name: 'JSON', test: JSON },
                { name: 'Blob', test: Blob },
                { name: 'localStorage', test: localStorage },
                { name: 'indexedDB', test: indexedDB },
                { name: 'GeoLocation API', test: navigator.geolocation },
                { name: 'WebRTC API', test: (window.mozRTCPeerConnection || window.webkitRTCPeerConnection || RTCPeerConnection) },
                { name: 'FileSystem API', test: (navigator.webkitPersistentStorage || window.webkitStorageInfo) }
            ],
            features = [
                { name: 'Object.observe', test: Object.observe }
            ],
            result = {
                isCompatible: false,
                missingFeatures: [],
                missingRequirements: []
            };

        // These are really needed!
        requirements.forEach(function (requirement) {
            if (!requirement.test) result.missingRequirements.push(requirement.name);
        });

        // Those features could be compensated by (polyfills/shims/shivs)
        // if the browser doesn't support them
        features.forEach(function (feature) {
            if (!feature.test) result.missingFeatures.push(feature.name);
        });

        // Finally set a single compatibility flag
        result.isCompatible = result.missingRequirements.length === 0;

        return result;

    }

    return {

        computation: computation,
        crypto: crypto,
        grid: grid,
        mediator: mediator,
        network: network,
        project: project,
        settings: settings,
        storage: storage,

        /**
         * Initiate muskepeer
         *
         * @method init
         * @chainable
         * @return {Object}
         */
        init: function () {

            logger.log('Uuid', this.settings.uuid);

            try {
                var device = getDeviceCapabilities();

                if (!device.isCompatible) {
                    var msg = 'The following features are required but not supported by your browser: ' + device.missingRequirements.join('\n');
                    window.alert(msg);
                    return;
                }
            }
            catch (e) {
                window.alert('Your browser is not supported.');
            }


            return this;
        },
        /**
         * Start muskepeer
         *
         * @method start
         * @chainable
         * @param config Configuration-Object
         * @returns {Object}
         */
        start: function (config) {

            // Create project object from passed options
            project.create(config.project)
                .then(storage.init)
                .then(function () {

                    // Anything to do at all?
                    if (!project.active) {
                        throw Error('Project is disabled');
                    }

                    // Create a Uuid (which is a hash here) for each node
                    config.nodes.forEach(function (node) {
                        node.uuid = crypto.hash(node.host + node.port)
                    });

                    // Store node configuration
                    return storage.db.saveMultiple('nodes', config.nodes, {allowDuplicates: false, uuidIsHash: true})
                })
                .then(function () {

                    // Collection files
                    var requiredFiles = [];

                    // Add workerFile
                    if (project.computation.workers.enabled && project.computation.workers.url) {
                        requiredFiles.push({ url: project.computation.workers.url, type: 'text/javascript'});
                    }

                    // Add factoryFile
                    if (project.computation.factories.enabled && project.computation.factories.url) {
                        requiredFiles.push({ url: project.computation.factories.url, type: 'text/javascript'});
                    }

                    // Store fileInfo to fileSystem
                    return storage.fs.add(_.union(project.files, requiredFiles))
                })
                .then(function () {
                    //TODO Currently all files get downloaded not loaded from other peers as
                    // Blob is not yet supported via DataChannel
                    return storage.fs.downloadIncompleteFiles();
                })
                .done(function () {

                    // Initialize caches
                    computation.jobs.init();
                    computation.results.init();

                    // Couple computation & network
                    mediator.couple();

                    // Finallly initialize the network and computation module
                    network.start();
                    //computation.start();
                });

            return this;
        },

        /**
         * Stop muskepeer
         * @method stop
         * @chainable
         */
        stop: function () {

            mediator.decouple();

            this.computation.stop();
            this.network.stop();

            return this;

        }


    };


})
;