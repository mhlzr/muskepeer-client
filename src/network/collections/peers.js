/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', 'lodash', 'settings', '../../musketeer-module', '../model/peer'], function (Q, _, settings, MusketeerModule, Peer) {

    var module = new MusketeerModule(),
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
            //TODO check if no already existsent
            _peers.push(peer);
        },

        connect: function (peers) {

            //pass peers, otherwise will take all
            peers = peers || _peers;

            var promises = [];

            peers.forEach(function (peer) {
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
                    _peers.push(new Peer(data));
                }

            });

            //TODO sort peers
        }




    });
});