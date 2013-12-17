/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', 'lodash', 'settings', 'geolocation', '../../muskepeer-module', '../model/peer'], function (Q, _, settings, geolocation, MuskepeerModule, Peer) {

        var module = new MuskepeerModule(),
            _peers = [],
            _nextPeer,
            _previousPeer;

        /**
         * @private
         * @method findNextPeer
         * @return {Peer}
         */
        function findNextPeer() {
            if (_peers.length >= 1) {
                return _peers[0];
            }
            return null;
        }

        /**
         * @private
         * @method findPreviousPeer
         * @return {Peer}
         */
        function findPreviousPeer() {
            if (_peers.length >= 2) {
                return _peers[1];
            } else if (_peers.length == 1) {
                return _peers[0];
            }
            return null;
        }

        return module.extend({

            list: _peers,

            add: function (peer) {
                if (!module.getPeerByUuid(peer.uuid)) {
                    _peers.push(peer);
                }
            },

            connect: function (peers) {

                //pass peers, otherwise will take all
                peers = peers || _peers;

                var promises = [];

                _.each(peers, function (peer) {

                    // Never connect to null or self
                    if (!peer || peer.uuid === settings.uuid) return;

                    promises.push(peer.createConnection());
                });

                return Q.all(promises);
            },

            connectToNeighbourPeers: function () {
                var neighbours = module.getNeighbourPeers();

                //if next === previous
                if (neighbours[0] === neighbours[1]) {
                    return module.connect([neighbours[0]]);
                }

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
             * @returns {Array}
             */
            getNeighbourPeers: function () {
                return [this.getNextPeer(), this.getPreviousPeer()];
            },

            getNextPeer: function () {
                if (!_nextPeer) _nextPeer = findNextPeer();
                return _nextPeer;
            },

            getPreviousPeer: function () {
                if (!_previousPeer) _previousPeer = findPreviousPeer();
                return _previousPeer;
            },


            update: function (peerData) {

                logger.log('Peers', 'update');
                //multidimensional array form multiple nodes
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
                    //save as new peer
                    peer = new Peer(data);
                    module.add(peer);

                    // Calculate geolocation distance
                    peer.distance = geolocation.getDistanceBetweenTwoLocations(peer.location)

                });

                return;
                //sort peers by their geolocation-distance
                _peers = _.sortBy(_peers, function (peer) {
                    return peer.distance;
                });
            },


            /**
             * Send data to all connected peers
             *
             * @method broadcast
             * @param type
             * @param data
             */
            broadcast: function (type, data) {

                _peers.forEach(function (peer) {
                    if (!peer.isConnected) return;
                    peer.send(type, data);
                });
            }

        });
    }
);