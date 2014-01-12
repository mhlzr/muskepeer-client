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

define(['q', 'lodash', 'storage/index', 'project', 'settings', './geolocation', 'muskepeer-module', './collections/nodes', './collections/peers', './model/service'],

    function (Q, _, storage, project, settings, geolocation, MuskepeerModule, nodes, peers, Service) {

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
            var peer = e.target,
                externalList = e.list,
                uuid = e.uuid,
                list;

            logger.log('Peer', peer.id, 'Received', e.type);

            if (!e.type) {
                logger.log('Network', 'peer:message without type received');
                return;
            }
            switch (e.type.toLowerCase()) {

                case 'node:list:pull' :
                    peer.sendNodeList(nodes.getNodeUuidsAsArray());
                    break;
                case 'peer:list:pull' :
                    peer.sendPeerList(peers.getPeerUuidsAsArray());
                    break;
                case 'file:list:pull' :
                    storage.getFileUuidsAsArray().then(function (list) {
                        peer.sendFileList(list);
                    });
                    break;
                case 'job:list:pull' :
                    storage.getJobUuidsAsArray().then(function (list) {
                        peer.sendJobList(list);
                    });
                    break;
                case 'result:list:pull' :
                    storage.getResultUuidsAsArray().then(function (list) {
                        peer.sendResultList(list);
                    });
                    break;
                case 'node:list:push':
                    list = nodes.getMissingNodeUuidsAsArray(externalList);
                    logger.log('Peer', peer.id, 'Result of node:sync', list.length);
                    peer.getNodeByUuid(list);
                    break;
                case 'peer:list:push':
                    list = peers.getMissingPeerUuidsAsArray(externalList);
                    logger.log('Peer', peer.id, 'Result of peer:sync', list.length);
                    peer.getPeerByUuid(list);
                    break;
                case 'file:list:push':
                    storage.getMissingFileUuidsAsArray(externalList).then(function (list) {
                        logger.log('Peer', peer.id, 'Result of file:sync', list.length);
                        peer.getFileByUuid(list);
                    });
                    break;
                case 'job:list:push':
                    storage.getMissingJobUuidsAsArray(externalList).then(function (list) {
                        logger.log('Peer', peer.id, 'Result of job:sync', list.length);
                        peer.getJobByUuid(list);
                    });
                    break;
                case 'result:list:push':
                    storage.getMissingResultUuidsAsArray(externalList).then(function (list) {
                        logger.log('Peer', peer.id, 'Result of result:sync', list.length);
                        peer.getResultByUuid(list);
                    });
                    break;

                case 'node:pull':
                    peer.sendPeer(nodes.getNodeByUuid(uuid).serialize());
                    break;
                case 'peer:pull':
                    peer.sendPeer(peers.getPeerByUuid(uuid).serialize());
                    break;
                case 'file:pull':
                    break;
                case 'job:pull':
                    storage.db.read('jobs', uuid, {uuidIsHash: true}).then(function (job) {
                        peer.sendJob(job);
                    });
                    break;
                case 'result:pull':
                    storage.db.read('results', uuid, {uuidIsHash: true}).then(function (result) {
                        if (result) peer.sendResult(result);
                    });
                    break;

                case 'node:push':
                    nodes.update(e.node);
                    break;
                case 'peer:push':
                    peers.update(e.peer);
                    break;
                case 'file:push':
                    break;
                case 'job:push':
                    storage.db.save('jobs', e.job, {uuidIsHash: true});
                    break;
                case 'result:push':
                    storage.db.save('results', e.result, {uuidIsHash: true});
                    break;

                case 'broadcast:job':
                    break;
                case 'broadcast:result':

                    console.log('got a result broadcast');

                    // Do i already know about this?
                    storage.db.has('results', e.data.uuid)
                        .then(function (exists) {

                            if (!exists) {
                                // Store the result
                                storage.db.save('results', e.data, {uuidIsHash: true});

                                // Rebroadcast
                                peers.broadcast('result', e.data, peer.uuid);
                            }
                        });

                    break;
                case 'broadcast:peer':
                    break;
                case 'broadcast:file':
                    break;
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
                //TODO deconstruct, remove listeners
            },


            /**
             *@method publish
             */
            publish: function (type, data) {

                logger.log('Network', 'publishing');

                // Broadcast to peers
                peers.broadcast(type, data);

                // Broadcast to services
                module.services.forEach(function (service) {
                    service.save(data);
                });
            }

        });
    });