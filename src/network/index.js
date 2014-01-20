/**
 *
 * @module Network
 * @class Network
 * @extends MuskepeerModule
 * @uses window
 *
 * @see http://www.html5rocks.com/en/mobile/workingoffthegrid/
 *
 */

define(['q', 'lodash', 'crypto/index', 'storage/index', 'project', 'settings', './geolocation', 'muskepeer-module', './collections/nodes', './collections/peers', 'uuid', './model/service'],


    function (Q, _, crypto, storage, project, settings, geolocation, MuskepeerModule, nodes, peers, uuid, Service) {


        var MASTER_BROADCAST_MESSAGE_TTL = 1000 * 60, //1m
            MASTER_BROADCAST_PEER_MAX_TIME_DRIFTING = 1000 * 60 * 2; //2m

        var module = new MuskepeerModule();

        // Detect network change
        window.addEventListener('offline', networkConnectivityStateChangeHandler);
        window.addEventListener('online', networkConnectivityStateChangeHandler);

        /**
         * Event-Handler, called when Network state changes
         *
         * @private
         * @method networkConnectivityStateChangeHandler
         * @param {Object} e
         */
        function networkConnectivityStateChangeHandler(e) {
            if (e.type === 'online') {
                logger.log('Network', 'online!');
            }
            else {
                logger.warn('Network', 'offline!');
            }
        }

        /**
         * @private
         * @method registerExternalServices
         */
        function registerExternalServices() {
            // Create external storage services
            project.network.services.forEach(function (settings, index) {
                if (!settings.enabled) return;
                settings.id = index + 1;
                module.services.push(new Service(settings));
            });

            logger.log('Network', 'ExternalServices registered');
        }


        /**
         * @private
         * @method masterMessageHandler
         */
        function masterMessageHandler(e) {


            if (isValidMasterMessage(e.data.message, e.data.signature)) {

                storage.db.has('messages', e.data.message.uuid)
                    .then(function (exists) {

                        if (!exists) {

                            // Inform and overwrite event-type
                            module.emit(e.type.replace('broadcast:', 'grid:'), e.data.message);

                            // Save
                            storage.db.save('messages', e.data.message)
                                .then(function () {
                                    // Broadcast
                                    peers.broadcast(e.type, e.data, e.target.uuid);
                                });

                        }
                    })
            }
        }


        /**
         * @private
         * @method isValidMasterMessage
         */
        function isValidMasterMessage(message, signature) {
            var now = Date.now();

            if (!message || !signature) return false;

            // Signature is okay?
            if (!crypto.verify(JSON.stringify(message), signature)) {
                return false;
            }

            // We allow, some drifting, as time between clients might not be in sync
            if (!message.timestamp || message.timestamp > now + MASTER_BROADCAST_PEER_MAX_TIME_DRIFTING) {
                return false;
            }

            // TTL reached?
            if (now > message.timestamp + MASTER_BROADCAST_MESSAGE_TTL) {
                return false;
            }

            return true;
        }

        /**
         * Event-Handler, gets called when another Peer sends an offer
         * If the Peer is not yet in the Peers-Collection, it will be created and added.
         * Then the answering process gets initialized.
         *
         * @private
         * @method peerOfferHandler
         * @param {Object} data
         */
        function peerOfferHandler(data) {
            var peer = peers.getPeerByUuid(data.targetPeerUuid);

            if (!peer) {

                peers.update([
                    {
                        uuid: data.targetPeerUuid,
                        nodes: [data.nodeUuid],
                        location: data.location,
                        isSource: true,
                        isTarget: false
                    }
                ]);

                peer = peers.getPeerByUuid(data.targetPeerUuid);
            }

            peer.answerOffer(data);
        }

        /**
         * Event-Handler, gets called when another Peer sends an answer to an offer
         *
         * @private
         * @method peerAnswerHandler
         * @param {Object} data
         */
        function peerAnswerHandler(data) {
            var peer = peers.getPeerByUuid(data.targetPeerUuid);
            peer.acceptConnection(data);
        }

        /**
         * Event-Handler, gets called when another Peer sends candidate-data.
         * Adds the candidate-data to the Peer it came from
         *
         * @private
         * @method peerCandidateHandler
         * @param {Object} data
         */
        function peerCandidateHandler(data) {
            var peer = peers.getPeerByUuid(data.targetPeerUuid);
            peer.addCandidate(data);
        }


        /**
         * Event-Handler, gets called when a Peer-connection is completely established.
         *
         * @private
         * @method peerConnectedHandler
         * @param {Peer} peer
         */
        function peerConnectedHandler(peer) {
            peer.synchronize();
        }

        /**
         * Event-Handler, gets called when a Peer-connection is closed.
         * Causes a reconnect to nearest Peers if needed.
         *
         * @private
         * @method peerDisconnectHandler
         * @param {Object} e
         */
        function peerDisconnectHandler(e) {
            if (peers.getConnectedPeers().length < settings.maxPeers) {
                peers.connectToNeighbourPeers();
            }
        }

        /**
         * Event-Handler, gets called when a Peer-connection
         * can't be established after a specific time interval and a timeout occured.
         *
         * @private
         * @method peerTimeoutHandler
         * @param {Object} e
         */
        function peerTimeoutHandler(e) {
            peerDisconnectHandler(e);
        }


        /**
         * Event-Handler, gets called when a Peer receives a message.
         *
         * @param {Object} e
         */
        function peerMessageHandler(e) {

            //logger.log('Peer ' + e.target.id, 'Received', e.type);

            if (!e.type) {
                logger.log('Network', 'Peer-message without type received');
                return;
            }


            // Seems to be a master-message
            if (e.data && e.data.message && e.data.signature) {
                masterMessageHandler(e);
            } else {
                // Pass-through events
                module.emit(e.type, e);
            }


        }


        return module.extend({

            /**
             * Determine if the client is on-/offline
             * @property isOnline {Boolean}
             */
            isOnline: window.navigator.onLine,

            nodes: nodes,
            peers: peers,

            services: [],

            /**
             * Start the network-module
             *
             * @method start
             */
            start: function () {

                // No need to do anything more if we are not online
                if (!module.isOnline) {
                    logger.warn('Network', 'not starting, no internet-connection.');
                    return;
                }

                // Adding listeners to nodes collection
                nodes.on('peer:offer', peerOfferHandler);
                nodes.on('peer:answer', peerAnswerHandler);
                nodes.on('peer:candidate', peerCandidateHandler);

                // Adding listeners to peers collection
                peers.on('peer:connect', peerConnectedHandler);
                peers.on('peer:message', peerMessageHandler);
                peers.on('peer:disconnect', peerDisconnectHandler);
                peers.on('peer:timeout', peerTimeoutHandler);


                registerExternalServices();


                // Detect geoLocation
                geolocation.getGeoLocation()
                    .then(function (location) {
                        logger.log('Geolocation', 'Location available');
                        // Get nodes from database
                        return storage.db.findAndReduceByObject('nodes', {filterDuplicates: false}, {projectUuid: project.uuid})
                    })
                    .then(function (nodeData) {
                        // Create instances of type model/node
                        nodes.update(nodeData);
                    })
                    .then(nodes.connect)
                    .then(nodes.authenticate)
                    .then(nodes.getRelatedPeers)
                    .then(function (peerData) {
                        // Create instances of type model/peer
                        peers.update(peerData);
                    })
                    .then(peers.connectToNeighbourPeers)
                    .done(function () {
                        logger.log('Network', 'Start complete');
                    });

            },
            /**
             * Stop the network module
             *
             * @method stop
             */
            stop: function () {
                //TODO deconstruct, remove listeners, close all connections
            },


            /**
             *@method publish
             */
            publish: function (type, data) {

                // Broadcast to peers
                peers.broadcast(type, data);

                // Broadcast to services
                module.services.forEach(function (service) {
                    service.save(data);
                });
            },


            /**
             * @method broadcastMasterMessage
             * @param type
             * @param data
             */
            broadcastMasterMessage: function (type, data) {

                data = data || {};

                var msg = _.extend(data, {
                    uuid: uuid.generate(),
                    type: type,
                    timestamp: Date.now()
                });

                var signature = crypto.sign(JSON.stringify(msg));

                if (!signature) return;

                // Save
                storage.db.save('messages', msg)
                    .then(function () {

                        // Broadcast
                        peers.broadcast(type, {
                                'message': msg,
                                'signature': signature
                            }
                        );
                    });


            }
        });
    }
);

