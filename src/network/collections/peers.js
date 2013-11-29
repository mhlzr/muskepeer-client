/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', 'lodash', 'settings', 'geolocation', '../../muskepeer-module', '../model/peer'], function (Q, _, settings, geolocation, MuskepeerModule, Peer) {

    var module = new MuskepeerModule(),
        _peers = [],
        _nextPeer,
        _previousPeer;

    function findNextPeer() {
        //TODO algorithm

        return _peers.shift();
    }

    function findPreviousPeer() {
        //TODO algorithm
        return _peers.pop();
    }

    return module.extend({

        list: _peers,

        add: function (peer) {
            //TODO check if no already existent
            _peers.push(peer);
        },

        connect: function (peers) {

            //pass peers, otherwise will take all
            peers = peers || _peers;

            var promises = [];

            _.each(peers, function (peer) {
                promises.push(peer.createConnection());
            });

            return Q.all(promises);
        },

        connectToNeighbourPeers: function () {
            return module.connect([_nextPeer, _previousPeer]);
        },


        getPeerByUuid: function (uuid) {
            return _.find(_peers, function (peer) {
                return peer.uuid === uuid;
            });
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

            //multidimensional array form multiple nodes
            peerData = _.flatten(peerData);

            //TODO save nodeUuid for multiple

            peerData.forEach(function (data) {
                //make sure it's not self
                if (data.uuid !== settings.uuid) {
                    module.add(new Peer(data));
                }

            });

            //sort peers by their geolocation-distance
            _peers = _.sortBy(_peers, function (peer) {
                return geolocation.getDistanceBetweenTwoLocations(peer.location)
            });
        }




    });
});