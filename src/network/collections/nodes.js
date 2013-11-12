/**
 * @author Matthieu Holzer
 * @date 05.11.13
 */

define(['q', '../model/node', '../../musketeer-module'], function (Q, Node, MusketeerModule) {
    var _nodes = [],
        module = new MusketeerModule();

    return module.extend(
        {
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
                var node;
                nodeData.forEach(function (data) {
                    node = new Node(data);
                    //pass-through events
                    node.onAny(function (e) {
                        module.emit(this.event, e)
                    });
                    _nodes.push(node);
                });
            },

            getNodeByUrl: function (url) {
                return _.find(_nodes, function (node) {
                    return node.url === url;
                });
            },

            getNodeUuidsAsArray: function () {
                return _.map(_nodes, function (node) {
                    return node.uuid;
                })
            },

            getNodeByUuid: function (uuid) {
                return _.find(_nodes, function (node) {
                    return node.uuid === uuid;
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
        });

});