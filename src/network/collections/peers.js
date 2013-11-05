/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', 'lodash', 'settings', '../model/peer'], function (Q, _, settings, Peer) {
    var _peers = [],
        _nextPeer,
        _previousPeer,
        _ownPeer;

    function findNextPeer() {
        //TODO algorithm
        return _peers.shift();
    }

    function findPreviousPeer() {
        //TODO algorithm
        return _peers.pop();
    }

    return {

        hasConnections: false,
        connect: function (peers) {

            //pass peers, elsewhise will take all
            peers = peers || _peers;

            var promises = [];

            peers.forEach(function (peer) {
                promises.push(peer.connect());
            });

            return Q.all(promises);
        },

        connectToNeighbours: function () {
            return this.connect([_nextPeer, _previousPeer]);
        },
        getOwnPeer: function () {
            return _ownPeer;
        },

        getById: function () {
            return null;
        },

        getNext: function () {
            if (!_nextPeer) _nextPeer = findNextPeer();
            return _nextPeer;
        },

        getPrevious: function () {
            if (!_previousPeer) _previousPeer = findPreviousPeer();
            return _previousPeer;
        },


        update: function (peerData) {

            //multidimensional array form multple nodes
            peerData = _.flatten(peerData);

            //TODO save nodeUuid for multiple

            peerData.forEach(function (data) {

                //maken sure it's not self
                if (data.uuid !== settings.uuid) {
                    _peers.push(new Peer(data));
                }
                //self
                else if (!_ownPeer) {
                    _ownPeer = new Peer(data);
                }

            });

            //TODO sort peers
        }
    };
});