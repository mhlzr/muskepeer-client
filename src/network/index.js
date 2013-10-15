/**
 *
 * @module Network
 *
 */

define(function (require) {

    var nodes = [],
        peers = [];

    return{

        uid: null,


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
    }
});