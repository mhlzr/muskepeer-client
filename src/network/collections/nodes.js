/**
 * Collection for Node-Instances
 *
 * @module Network
 * @class Nodes
 *
 */

define(['q', '../model/node', '../../muskepeer-module'], function (Q, Node, MuskepeerModule) {

    var _nodes = [],
        module = new MuskepeerModule();

    return module.extend(
        {
            /**
             * @property list
             * @type {Array}
             */
            list: _nodes,

            /**
             * @method connect
             * @return {Promise}
             */
            connect: function () {
                var promises = [];

                logger.log('Nodes', 'Connecting...');

                _nodes.forEach(function (node) {
                    promises.push(node.connect());
                });

                return Q.all(promises);
            },

            /**
             * @method update
             * @param {Array} nodeData
             */
            update: function (nodeData) {
                var node;
                nodeData.forEach(function (data) {
                    node = new Node(data);

                    node.id = _nodes.length + 1;

                    // Pass-through events
                    node.onAny(function (e) {
                        module.emit(this.event, e)
                    });

                    _nodes.push(node);
                });

                //Update public list
                this.list = _nodes;
            },

            /**
             * @method getNodeByUrl
             * @param {String} url
             * @return {Node}
             */
            getNodeByUrl: function (url) {
                return _.find(_nodes, function (node) {
                    return node.url === url;
                });
            },

            /**
             * @method getNodeUuidsAsArray
             * @return {Array}
             */
            getNodeUuidsAsArray: function () {
                return _.map(_nodes, function (node) {
                    return node.uuid;
                })
            },

            /**
             * @method getMissingNodeUuidsAsArray
             * @param {Array} externalList
             * @return {Array}
             */
            getMissingNodeUuidsAsArray: function (externalList) {
                var internalList = module.getNodeUuidsAsArray();
                return _.difference(externalList, internalList);
            },


            /**
             * @method getNodeByUuid
             * @param {String} uuid
             * @return {Node}
             */
            getNodeByUuid: function (uuid) {
                return _.find(_nodes, function (node) {
                    return node.uuid === uuid;
                });
            },

            /**
             * @method authenticate
             * @return {Promise}
             */
            authenticate: function () {
                var promises = [];

                logger.log('Nodes', 'Authenticating...');

                _nodes.forEach(function (node) {
                    var deferred = Q.defer();
                    node.sendAuthentication()
                        .then(function () {

                            deferred.resolve();
                        });
                    promises.push(deferred.promise);

                });

                return Q.all(promises);

            },

            /**
             * @method getRelatedPeers
             * @return {Array}
             */
            getRelatedPeers: function () {
                var promises = [];

                _nodes.forEach(function (node) {
                    var deferred = Q.defer();
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