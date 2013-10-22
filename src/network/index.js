/**
 *
 * @module Network
 *
 */

define(['q', 'lodash', 'geolocation', 'project', 'musketeer-module', './model/node'], function (Q, _, geolocation, project, MusketeerModule, Node) {

    var geoLocation,
        module = new MusketeerModule(),
        nodes = [],
        peers = [];

    // Detect network change
    // http://www.html5rocks.com/en/mobile/workingoffthegrid/
    window.addEventListener('offline', networkConnectivityStateChangeHandler);
    window.addEventListener('online', networkConnectivityStateChangeHandler);

    function networkConnectivityStateChangeHandler(e) {
        if (e.type === 'online') {
            console.log('online');
            module.emit('node:connected');
        }
        else {
            console.log('offline');
            module.emit('node:disconnected');
        }
    }

    module.emit('node:disconnected');

    return module.extend({

        isOnline: window.navigator.onLine,
        nodes: nodes,

        start: function (nodeSettings) {

            //no need to do anything here if we are not online
            if (!this.isOnline) return;

            //detect geoLocation if needed
            if (project.network.useGeoLocation) {
                geolocation.getGeoLocation().then(function (location) {
                    geoLocation = location;
                });
            }

            /*this.connectToNodes(nodeSettings)
             //then registerForProject(project.uuid)
             .then(this.getAllProjectRelatedPeersFromConnectedNodes(project.uuid))
             .then(function (peers) {
             console.log(peers)
             });
             */
            //then
            /*
             node.push(node);

             */

        },

        connectToNodes: function (nodes) {
            var promises = [];

            var deferred, n;
            nodes.forEach(function (node) {
                deferred = Q.defer();

                //create new node
                n = new Node(node.host, node.port).connect(function () {
                    deferred.resolve();
                });

                console.log(n);
                //push to nodes
                nodes.push(n);
                promises.push(deferred.promise);
            });

            return Q.all(promises);
        },

        connectToPeer: function (uid) {

        },

        connectToAllPeers: function () {

        },

        getAllProjectRelatedPeersFromConnectedNodes: function () {
            var promises = [];

            var deferred;
            nodes.forEach(function (node) {
                deferred = Q.defer();
                node.getAllPeers(function (peers) {
                    deferred.resolve(peers);
                });
                promises.push(deferred.promise);

            });
            return Q.all(promises);
        },

        sendToPeer: function (peerId, key, data) {
        },
        sendToNode: function (nodeId, key, data) {
        },
        /**
         * Send data to all nodes and peers
         * @param key
         * @param data
         */
        broadcast: function (key, data) {
        }


    });
});