/**
 *
 * @module Network
 * @class Network
 *
 */

define(['q', 'lodash', 'storage/index', 'project', 'settings', 'geolocation', 'muskepeer-module', './collections/nodes', './collections/peers', './model/peer'],

    function (Q, _, storage, project, settings, geolocation, MuskepeerModule, nodes, peers, Peer) {

        var _module = new MuskepeerModule();

        // Detect network change
        // http://www.html5rocks.com/en/mobile/workingoffthegrid/
        window.addEventListener('offline', networkConnectivityStateChangeHandler);
        window.addEventListener('online', networkConnectivityStateChangeHandler);

        /**
         * @private
         * @method networkConnectivityStateChangeHandler
         * @param {Object} e Event-Object
         */
        function networkConnectivityStateChangeHandler(e) {
            if (e.type === 'online') {
                logger.warn('Device is online!');
            }
            else {
                logger.warn('Device is offline!');
            }
        }

        /**
         * Event-Handler, gets called when another Peer sends an offer
         *
         * @private
         * @method peerOfferHandler
         * @param data
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
         * @private
         * @method peerCandidateHandler
         * @param {Object} data
         */
        function peerCandidateHandler(data) {
            var peer = peers.getPeerByUuid(data.targetPeerUuid);
            peer.addCandidate(data);
        }


        return _module.extend({

            /**
             * @property isOnline {Boolean}
             */
            isOnline: window.navigator.onLine,

            nodes: nodes,
            peers: peers,

            /**
             * @method start
             */
            start: function () {

                //no need to do anything more if we are not online
                if (!_module.isOnline) return;

                //peer listeners
                nodes.on('peer:offer', peerOfferHandler);
                nodes.on('peer:answer', peerAnswerHandler);
                nodes.on('peer:candidate', peerCandidateHandler);

                //peers.on('sync:nodes');
                //peers.on('sync:files');
                //peers.on('sync:jobs');
                //peers.on('sync:results');

                //detect geoLocation if needed
                geolocation.getGeoLocation()
                    .then(function (location) {
                        return storage.findAndReduceByObject('nodes', {filterDuplicates: false}, {projectUuid: project.uuid})
                    })
                    .then(function (nodeData) {
                        //creates objects of type model/node
                        nodes.update(nodeData);
                    })
                    .then(nodes.connect)
                    .then(nodes.authenticate)
                    .then(nodes.getRelatedPeers)
                    .then(function (peerData) {
                        //creates objects of type model/peer
                        peers.update(peerData);
                    })
                    .then(peers.connectToNeighbourPeers)
                    .done(function () {
                        logger.log('Network', 'Start complete');
                    });

            },
            /**
             * @method stop
             */
            stop: function () {

            },

            /**
             * Send data to all nodes and peers
             *
             * @method broadcast
             * @param type {String} defines type of data
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