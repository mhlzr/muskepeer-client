/**
 * Collection for Peer-Instances
 *
 * @module Network
 * @class Peers
 *
 */

define(['q', 'lodash', 'settings', '../geolocation', '../../muskepeer-module', '../model/peer'], function (Q, _, settings, geolocation, MuskepeerModule, Peer) {


        var TIMEOUT_RETRY_TIME = 60000, //60s
            MAX_RANDOM_ASSESSMENT_DELAY_TIME = 1500;

        var module = new MuskepeerModule(),
            _peers = [];


        return module.extend({

            /**
             * @property list
             * @type {Array}
             */
            list: _peers,

            /**
             * @method add
             * @param peer
             */
            add: function (peer) {
                if (!module.getPeerByUuid(peer.uuid)) {
                    _peers.push(peer);
                }
            },

            /**
             * @method connect
             * @param {Array} [peers]
             * @return {Promise}
             */
            connect: function (peers) {

                //pass peers, otherwise will take all
                peers = peers || _peers;

                var promises = [];

                _.each(peers, function (peer) {

                    // Never connect to null or self
                    if (!peer || peer.uuid === settings.uuid) return;

                    // No need to connect if already connected
                    if (!peer.isConnected) {
                        promises.push(peer.createConnection());
                    }

                });

                return Q.all(promises);
            },

            /**
             * @method connectToNeighbourPeers
             * @return {Promise}
             */
            connectToNeighbourPeers: function () {
                return module.connect(module.getNeighbourPeers());
            },


            /**
             * @method getPeerByUuid
             * @param {String} uuid
             * @returns {Peer}
             */
            getPeerByUuid: function (uuid) {
                return _.find(_peers, function (peer) {
                    return peer.uuid === uuid;
                });
            },

            /**
             * @method getNeighbourPeers
             * @return {Array}
             */
            getNeighbourPeers: function () {
                // Assuming they are already sorted in a specific way
                // e.g. geolocation-distance

                // Remove all peers that had a timeout shortly
                var peers = _peers.filter(function (peer) {
                    // Timeout at all? && Timeout was long ago
                    return !peer.timeout || peer.timeout + TIMEOUT_RETRY_TIME < Date.now();
                });

                return peers.slice(0, settings.maxPeers || 2);
            },


            /**
             * Get all known Peers Uuids as an array
             *
             * @method getPeerUuidsAsArray
             * @return {Array}
             */
            getPeerUuidsAsArray: function () {
                return _.map(_peers, function (peer) {
                    return peer.uuid;
                })
            },

            /**
             * Compare a list of given peers to the local one,
             * return the ones that are missing locally.
             *
             * @method getPeerUugetMissingPeerUuidsAsArrayidsAsArray
             * @param {Array} externalList
             * @return {Array}
             */

            getMissingPeerUuidsAsArray: function (externalList) {
                var internalList = module.getPeerUuidsAsArray();
                // The external list will always include the uuid of this peer,
                // so we add it herejust for the comparison
                internalList.push(settings.uuid);
                return _.difference(externalList, internalList);
            },


            /**
             * @method update
             * @param {Object} peerData
             */
            update: function (peerData) {

                // Multidimensional array form multiple nodes needs to be flattened
                peerData = _.flatten(peerData);

                peerData.forEach(function (data) {

                    //make sure it's not self
                    if (data.uuid === settings.uuid) return;

                    //already got this one?
                    var peer = module.getPeerByUuid(data.uuid);

                    //already got this peer?
                    if (peer) {
                        //only add the node uuid
                        peer.addNodes(data.nodes);
                        return;
                    }

                    // Local id for debugging
                    data.id = _peers.length + 1;

                    // Save as new peer
                    peer = new Peer(data);
                    module.add(peer);

                    // Pass-through events
                    peer.onAny(function (e) {
                        module.emit(this.event, e);
                    });

                    // Calculate geolocation distance
                    peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location);

                });


                // Sort peers by their geolocation-distance
                _peers = _.sortBy(_peers, function (peer) {
                    return peer.distance;
                });

                // Update public list
                this.list = _peers;
            },


            /**
             * Broadcast data to peers using a RAD--time.
             * Will exclude originPeerUuid from receivers if passed.
             *
             * @method broadcast
             * @param type
             * @param data
             * @param {String} [originPeerUuid]
             */
            broadcast: function (type, data, originPeerUuid) {

                var peers = module.getConnectedPeers();


                // Remove own uuid from list and
                // the peer we received the message from
                peers = _.reject(peers, function (peer) {
                    return peer.uuid === settings.uuid || peer.uuid === originPeerUuid;
                });

                // Nobody to broadcast to
                if (peers.length === 0) {
                    return;
                }

                logger.log('Peers', 'broadcasting to', peers.length, 'peers');

                // Broadcast to all connected peers
                peers.forEach(function (peer) {
                    // Get a RAD before broadcasting
                    var rad = Math.random() * MAX_RANDOM_ASSESSMENT_DELAY_TIME;
                    _.delay(peer.broadcast, rad, type, data);
                });
            },

            /**
             * Get a list of all peers to which there is an active connection.
             *
             * @method getConnectedPeers
             *
             * @return {Array}
             */
            getConnectedPeers: function () {
                return _.where(_peers, {isConnected: true});
            }

        });
    }
);