/**
 *
 * @module Network
 *
 */

define(['musketeer-module'], function (MusketeerModule) {

    var module = new MusketeerModule(),
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

        uid: null,

        isOnline: window.navigator.onLine,

        connectToNode: function (host, port) {

        },

        connectToPeer: function (uid) {

        },

        connectToAllPeers: function () {

        },

        getPeerListFromConnectedNodes: function () {

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