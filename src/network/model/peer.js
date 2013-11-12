/**
 * @author Matthieu Holzer
 * @date 12.11.13
 *
 * @see http://www.html5rocks.com/en/tutorials/webrtc/infrastructure/
 */

define(['lodash', 'q', '../collections/nodes'], function (_, Q, nodes) {

    var ICE_SERVER_SETTINGS = {
            iceServers: [
                { url: "stun:stun.l.google.com:19302" }
            ]},
        OPTIONAL_SETTINGS = {
            optional: [
                {RtpDataChannels: true}
            ]
        },
        MEDIA_CONSTRAINTS = {
            optional: [],
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        };

    var _self, _connection;


    /* EVENT HANDLER */
    function iceCandidateHandler(e) {
    }

    function iceConnectionStateChangeHandler(e) {

    }

    function negotiationNeededHandler(e) {
    }

    function dataChannelHandler(e) {
    }

    function createAnswer() {
    }


    /**
     * Find a signaling-channel two a given peer
     * @param peer
     * @returns Node
     */
    function getSignalChannel(peer) {
        var signal;

        //TODO create signaling via p2p network if possible, so no need for a node

        signal = _.intersection(nodes.getNodeUuidsAsArray(), peer.nodes);

        //get a sharedNode that we are connected to
        do {
            signal = nodes.getNodeByUuid(signal.shift());
        }
        while (!signal.isConnected);

        return signal;
    }


    /**
     * Factory for RTCPeerConnection
     * @param configuration
     * @constructor
     */
    function MRTCPeerConnection(ice, optional) {
        //TODO browser vendor fix
        return new webkitRTCPeerConnection(ice, optional);
    }


    var Peer = function (config) {

        _self = this;

        this.isConnected = false;
        this.isSource = config.isSource || false;
        this.isTarget = config.isTarget || false;
        this.uuid = config.uuid;
        this.location = config.location;
        this.nodes = config.nodes || [];

        //1.Alice creates an RTCPeerConnection object.
        _connection = new MRTCPeerConnection(ICE_SERVER_SETTINGS, OPTIONAL_SETTINGS);

        /**
         * Create a WebRTC-Connection
         * @param targetPeer
         */
        this.createConnection = function () {
            this.isSource = true;
            this.isTarget = false;

            var deferred = Q.defer,
                signal = getSignalChannel(_self);


            //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
            _connection.createOffer(function (sessionDescription) {

                //3. Alice calls setLocalDescription() with his offer.)
                _connection.setLocalDescription(sessionDescription);

                //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                signal.sendPeerOffer(_self.uuid, sessionDescription);

            }, null, MEDIA_CONSTRAINTS);


            return deferred.promise

        };


        /**
         *
         * @param data
         * @returns {promise|*}
         */
        this.answerOffer = function (data) {

            _self.isTarget = true;

            var deferred = Q.defer,
                signal = getSignalChannel(_self);

            //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
            _connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {

                //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
                _connection.createAnswer(function (sessionDescription) {

                    //7. Eve sets her answer as the local description by calling setLocalDescription().
                    _connection.setLocalDescription(sessionDescription);

                    //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
                    signal.sendPeerAnswer(_self.uuid, sessionDescription);

                }, null, MEDIA_CONSTRAINTS);

            });


            return deferred.promise;
        };


        /**
         * Accept a WebRTC-Connection
         * @param data
         */
        this.acceptConnection = function (data) {
            this.isTarget = true;
            this.isSource = false;

            //9. Alice sets Eve's answer as the remote session description using setRemoteDescription().
            _connection.setRemoteDescription(new RTCSessionDescription(data.answer));

        };
    };

    return Peer;
});