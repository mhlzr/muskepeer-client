/**
 *
 * @module Network
 *
 */

define(['q', 'lodash', 'storage/index', 'geolocation', 'project', 'settings', 'musketeer-module', './collections/nodes', './collections/peers', './model/node', './model/peer'],

    function (Q, _, storage, geolocation, project, settings, MusketeerModule, nodes, peers, Node, Peer) {

        var _geoLocation,
            _module = new MusketeerModule();

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
            nodes: nodes,

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
                    then(function (nodeData) {
                        nodes.update(nodeData);
                    })
                    .then(nodes.connect)
                    .then(nodes.authenticate)
                    .then(nodes.getRelatedPeers)
                    .then(function (peerData) {
                        peers.update(peerData);
                    })
                    .then(peers.connect)
                    // peers.connectToNeighbours;


                    .done(function () {
                        console.log('COMPLETE')
                    });

            },

            stop: function () {

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