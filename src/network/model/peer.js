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


    /**
     * Factory for RTCPeerConnection
     * @constructor
     */
    function MRTCPeerConnection(ice, optional) {
        //TODO browser vendor fix
        if (window.mozRTCPeerConnection) return new mozRTCPeerConnection(ice, optional);
        else if (window.webkitRTCPeerConnection) return new webkitRTCPeerConnection(ice, optional);
        else return new RTCPeerConnection(ice, optional);
    }

    /**
     * Factory for RTCIceCandidate
     * @constructor
     */
    function MRTCIceCandidate(candidate) {
        if (window.mozRTCIceCandidate) return new mozRTCIceCandidate(candidate);
        else return new RTCIceCandidate(candidate);
    }

    /**
     * Factory for RTCSessionDescription
     * @constructor
     */
    function MRTCSessionDescription(sdp) {
        if (window.mozRTCSessionDescription) return new mozRTCSessionDescription(sdp);
        else return new RTCSessionDescription(sdp);
    }


    var Peer = function (config) {

        var _connection, _channel;

        this.isConnected = false;
        this.isSource = config.isSource || false;
        this.isTarget = config.isTarget || false;
        this.uuid = config.uuid;
        this.location = config.location;
        this.nodes = config.nodes || [];


        this.channelErrorHandler = function (e) {
        };

        this.channelCloseHandler = function (e) {
            this.isConnected = false;
        };

        this.iceCandidateHandler = function (e) {
            //II. The handler is called when network candidates become available.
            if (!e || !e.candidate) return;

            // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
            var signal = this.getSignalChannel();
            signal.sendPeerCandidate(this.uuid, e.candidate);

        };

        this.iceConnectionStateChangeHandler = function (e) {
            //logger.log('Peer:iceConnectionStateChangeHandler', e);
        };

        this.negotiationNeededHandler = function (e) {
            //logger.log('Peer:negotiationNeededHandler', e);
        };

        this.dataChannelHandler = function (e) {
            //logger.log('Peer:dataChannelHandler', e);
        };

        this.channelMessageHandler = function (e) {
            logger.log('Peer received', e.data);
        };

        this.channelOpenHandler = function (e) {
            logger.log('Peer: Channel to ' + this.uuid + ' is open');
            this.isConnected = true;

            if (this.isSource) {
                _channel.send('message send to target');
            }

            if (this.isTarget) {
                _channel.send('message send to source');
            }

        };

        /**
         * Find a signaling-channel two a given peer
         * @returns Node
         */
        this.getSignalChannel = function () {
            var signal;

            //TODO create signaling via p2p network if possible, so no need for a node

            signal = _.intersection(nodes.getNodeUuidsAsArray(), this.nodes);

            //get a sharedNode that we are connected to
            do {
                signal = nodes.getNodeByUuid(signal.shift());
            }
            while (!signal.isConnected);

            return signal;
        };


        //1.Alice creates an RTCPeerConnection object.
        _connection = new MRTCPeerConnection(ICE_SERVER_SETTINGS, OPTIONAL_SETTINGS);

        //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.

        //bind this for event-handlers
        _.bindAll(this, 'iceCandidateHandler', 'iceConnectionStateChangeHandler', 'negotiationNeededHandler',
            'dataChannelHandler', 'channelMessageHandler', 'channelOpenHandler', 'channelErrorHandler', 'channelCloseHandler');

        //add listeners to connection
        _connection.ondatachannel = this.dataChannelHandler;
        _connection.onicecandidate = this.iceCandidateHandler;
        _connection.oniceconnectionstatechange = this.iceConnectionStateChangeHandler;
        _connection.onnegotiationneeded = this.negotiationNeededHandler;

        //create  data-channel
        _channel = _connection.createDataChannel('RTCDataChannel' + Math.random() * 1000 | 0, {
            reliable: false
        });

        //add listeners to channel
        _channel.onclose = this.channelCloseHandler;
        _channel.onerror = this.channelErrorHandler;
        _channel.onmessage = this.channelMessageHandler;
        _channel.onopen = this.channelOpenHandler;


        /**
         * Create a WebRTC-Connection
         */
        this.createConnection = function () {
            var uuid = this.uuid;

            this.isSource = true;
            this.isTarget = false;

            var deferred = Q.defer,
                signal = this.getSignalChannel();

            //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
            _connection.createOffer(function (sessionDescription) {

                    //3. Alice calls setLocalDescription() with his offer.)
                    _connection.setLocalDescription(sessionDescription);

                    //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                    signal.sendPeerOffer(uuid, sessionDescription);

                },
                function (err) {
                    logger.log(err);
                },
                MEDIA_CONSTRAINTS);


            return deferred.promise;

        };


        /**
         *
         * @param data
         * @returns {promise|*}
         */
        this.answerOffer = function (data) {

            var uuid = this.uuid,
                deferred = Q.defer,
                signal = this.getSignalChannel();

            //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
            _connection.setRemoteDescription(new MRTCSessionDescription(data.offer), function () {

                //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
                _connection.createAnswer(function (sessionDescription) {

                        //7. Eve sets her answer as the local description by calling setLocalDescription().
                        _connection.setLocalDescription(sessionDescription);

                        //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
                        signal.sendPeerAnswer(uuid, sessionDescription);

                    },
                    function (err) {
                        logger.log(err);
                    },
                    MEDIA_CONSTRAINTS);

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
            _connection.setRemoteDescription(new MRTCSessionDescription(data.answer));

        };

        /**
         * Add candidate info to connection
         * @param data
         */
        this.addCandidate = function (data) {
            _connection.addIceCandidate(new MRTCIceCandidate(data.candidate));
        };


        /**
         * Send data via WebRTC-Channelm to peer
         * @param data
         */
        this.send = function (data) {
            if (!this.isConnected) return;

            _channel.send(data);

        };

        /**
         * Save a reference to a node
         * @param nodeUuids Array of nodeUuids
         */
        this.addNodes = function (nodeUuids) {
            var self = this;

            nodeUuids.forEach(function (nodeUuid) {
                //store only if needed, no redundancy
                if (self.nodes.indexOf(nodeUuid) < 0) {
                    self.nodes.push(nodeUuid);
                }
            });

        }

    };

    return Peer;
});