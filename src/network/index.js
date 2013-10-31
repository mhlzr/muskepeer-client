/**
 *
 * @module Network
 *
 */

define(['q', 'lodash', 'storage/index', 'geolocation', 'project', 'settings', 'musketeer-module', './model/node'], function (Q, _, storage, geolocation, project, settings, MusketeerModule, Node) {

    var _geoLocation,
        _module = new MusketeerModule(),
        _nodes = [],
        _peers = [];

    // Detect network change
    // http://www.html5rocks.com/en/mobile/workingoffthegrid/
    window.addEventListener('offline', networkConnectivityStateChangeHandler);
    window.addEventListener('online', networkConnectivityStateChangeHandler);

    function networkConnectivityStateChangeHandler(e) {
        if (e.type === 'online') {
            console.log('online');
            _module.emit('node:connected');
        }
        else {
            console.log('offline');
            _module.emit('node:disconnected');
        }
    }


    return _module.extend({

        isOnline: window.navigator.onLine,
        nodes: _nodes,

        start: function () {



            //no need to do anything more if we are not online
            if (!_module.isOnline) return;

            //detect geoLocation if needed
            if (project.network.useGeoLocation) {
                geolocation.getGeoLocation().then(function (location) {
                    _geoLocation = location;
                });
            }

            //get all nodes related to this project via proectUuid
            storage.findAndReduceByObject('nodes', {filterDuplicates: true}, {projectUuid: project.uuid}).
                then(function (nodeSettings) {
                    return _module.createAndConnectToNodes(nodeSettings);
                })
                .then(function (nodes) {
                    _nodes = nodes;
                    return _module.sendAuthenticationToNodes(_nodes);
                })

                .done(function () {
                    console.log('COMPLETE')
                });


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

        stop: function () {

        },

        createAndConnectToNodes: function (settings) {
            var promises = [];

            var deferred, node;
            settings.forEach(function (setting) {
                deferred = Q.defer();

                //create new node
                node = new Node(setting.host, setting.port).connect(function () {
                    deferred.resolve(node);
                });

                promises.push(deferred.promise);
            });

            return Q.all(promises);
        },

        sendAuthenticationToNodes: function (nodes) {

            var promises = [];

            var deferred;
            nodes.forEach(function (node) {
                deferred = Q.defer();
                node.sendAuthentication()
                    .then(function () {
                        return node.getAllPeers()
                    }).then(deferred.resolve);
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