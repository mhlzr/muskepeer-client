/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', '../model/node'], function (Q, Node) {
    var _nodes = [];

    return {

        connect: function () {
            var promises = [];

            var deferred;
            _nodes.forEach(function (node) {
                deferred = Q.defer();

                node.connect(function () {
                    deferred.resolve(node);
                });

                promises.push(deferred.promise);
            });

            return Q.all(promises);
        },

        update: function (nodeData) {
            nodeData.forEach(function (data) {
                _nodes.push(new Node(data));
            });
        },

        authenticate: function () {
            var promises = [];

            var deferred;
            _nodes.forEach(function (node) {
                deferred = Q.defer();
                node.sendAuthentication()
                    .then(function () {
                        deferred.resolve();
                    });
                promises.push(deferred.promise);

            });

            return Q.all(promises);

        },

        getRelatedPeers: function () {
            var promises = [];

            var deferred;
            _nodes.forEach(function (node) {
                deferred = Q.defer();
                node.getAllRelatedPeers().then(function (peers) {
                    //add reference to node, to know where the peer is connected
                    peers.forEach(function (peer) {
                        peer.nodes = [node.uuid];
                    });
                    deferred.resolve(peers);
                });
                promises.push(deferred.promise);

            });
            return Q.all(promises);
        }
    };
});