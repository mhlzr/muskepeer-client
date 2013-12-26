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

define(['q', 'lodash', 'storage/index', 'project', 'settings', 'geolocation', 'muskepeer-module', './collections/nodes', './collections/peers'],

    function (Q, _, storage, project, settings, geolocation, MuskepeerModule, nodes, peers) {

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
         * @private
         * @method peerCandidateHandler
         * @param {Object} data
         */
        function peerCandidateHandler(data) {
            var peer = peers.getPeerByUuid(data.targetPeerUuid);
            peer.addCandidate(data);
        }


        function peerDisconnectHandler(e) {

        }


        function peerMessageHandler(e) {
            var peer = e.target,
                list;

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
                    list = nodes.getMissingNodeUuidsAsArray(e.list);
                    logger.log('Network', 'node:sync', list.length, 'differences.');
                    peer.getNodeByUuid(list);
                    break;
                case 'peer:list:push':
                    list = peers.getMissingPeerUuidsAsArray(e.list);
                    logger.log('Network', 'peer:sync', list.length, 'differences.');
                    peer.getPeerByUuid(list);
                    break;
                case 'file:list:push':
                    storage.getMissingFileUuidsAsArray(e.list).then(function (list) {
                        logger.log('Network', 'file:sync', list.length, 'differences.');
                        peer.getFileByUuid(list);
                    });
                    break;
                case 'job:list:push':
                    storage.getMissingJobUuidsAsArray(e.list).then(function (list) {
                        logger.log('Network', 'job:sync', list.length, 'differences.');
                        peer.getJobByUuid(list);
                    });
                    break;
                case 'result:list:push':
                    storage.getMissingResultUuidsAsArray(e.list).then(function (list) {
                        logger.log('Network', 'result:sync', list.length, 'differences.');
                        peer.getResultByUuid(list);
                    });
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

                // Adding listeners to nodes module
                nodes.on('peer:offer', peerOfferHandler);
                nodes.on('peer:answer', peerAnswerHandler);
                nodes.on('peer:candidate', peerCandidateHandler);

                // Adding listeners to peers module
                peers.on('peer:connect', function (peer) {

                    // Am I the Source?
                    if (peer.isTarget) {

                        peer.synchronize();


                    }

                    //TESTING
                    /*else {
                     //TESTING
                     storage.fs.readFileChunkAsDataUrl({uuid: '8e6bcaccef241392cd7d3b127438ce4f41a8d31450f105c34438805dee7f6d1a'})
                     .then(function (base64) {
                     peer.sendFile('some uuid', base64, 0);
                     });
                     }
                     */
                });

                peers.on('peer:message', peerMessageHandler);
                peers.on('peer:disconnect', peerDisconnectHandler);


                // Detect geoLocation if needed
                geolocation.getGeoLocation()
                    .then(function (location) {
                        logger.log('Geolocation', 'available');
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
             * Send data to all nodes and peers
             *
             * @method broadcast
             * @param type {String} Type of data
             * @param data {Object}
             */
            broadcast: function (type, data) {


                nodes.list.forEach(function (node) {
                    node.send(type, data);
                });

                peers.broadcast(type, data);
            }


        });
    });