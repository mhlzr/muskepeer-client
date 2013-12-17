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
     * Facade for RTCPeerConnection
     * @private
     * @class MRTCPeerConnection
     * @constructor
     */
    function MRTCPeerConnection(ice, optional) {
        if (window.mozRTCPeerConnection) return new mozRTCPeerConnection(ice, optional);
        else if (window.webkitRTCPeerConnection) return new webkitRTCPeerConnection(ice, optional);
        else return new RTCPeerConnection(ice, optional);
    }

    /**
     * Facade for RTCIceCandidate
     * @private
     * @class MRTCIceCandidate
     * @constructor
     */
    function MRTCIceCandidate(candidate) {
        if (window.mozRTCIceCandidate) return new mozRTCIceCandidate(candidate);
        else return new RTCIceCandidate(candidate);
    }

    /**
     * Facade for RTCSessionDescription
     * @private
     * @class MRTCSessionDescription
     * @constructor
     */
    function MRTCSessionDescription(sdp) {
        if (window.mozRTCSessionDescription) return new mozRTCSessionDescription(sdp);
        else return new RTCSessionDescription(sdp);
    }


    /**
     * @class Peer
     * @param config
     * @constructor
     */
    var Peer = function (config) {

        var _self = this,
            _connection,
            _channel;

        /**
         * Indicates if there is a stable conenction to this peer
         * @property isConnected
         * @default false
         * @type {Boolean}
         */
        this.isConnected = false;

        /**
         * Whether this peer is the initiator of a connection
         * @property isSource
         * @default false
         * @type {Boolean}
         */
        this.isSource = config.isSource || false;

        /**
         * Whether this peer is the initiator of a connection
         * @property isTarget
         * @default false
         * @type {Boolean}
         */
        this.isTarget = config.isTarget || false;

        /**
         * Universal unique identifier for this peer
         * @property uuid
         * @type {String}
         */
        this.uuid = config.uuid;

        /**
         * Geolocation of this peer
         * @property location
         * @type {Object}
         */
        this.location = config.location;

        /**
         * Distance to this peer in kilometers
         * @property distance
         * @default undefined
         * @type {Number}
         */
        this.distance = undefined;

        /**
         * Uuids of the nodes this peer is connected to,
         * used to find a signaling-channel.
         * @property nodes
         * @type {Array}
         */
        this.nodes = config.nodes || [];


        /**
         * Find a signaling-channel two a given peer
         *
         * @method getSignalChannel
         * @return {Node}
         */
        this.getSignalChannel = function () {
            var signal;

            signal = _.intersection(nodes.getNodeUuidsAsArray(), this.nodes);

            //get a sharedNode that we are connected to
            do {
                signal = nodes.getNodeByUuid(signal.shift());
            }
            while (!signal.isConnected);

            return signal;
        };

        /* Event Handler Start */
        function iceCandidateHandler(e) {
            //II. The handler is called when network candidates become available.
            if (!e || !e.candidate) return;

            // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
            var signal = _self.getSignalChannel();
            signal.sendPeerCandidate(_self.uuid, e.candidate);

        }

        function negotiationNeededHandler(e) {
            //logger.log('Peer:negotiationNeededHandler', e);
        }

        function dataChannelHandler(e) {
            logger.log('Peer', 'got remote datachannel');

            _channel = e.channel;

            _channel.onclose = channelCloseHandler;
            _channel.onerror = channelErrorHandler;
            _channel.onmessage = channelMessageHandler;
            _channel.onopen = channelOpenHandler;
        }

        function iceConnectionStateChangeHandler(e) {

            // Do we have lift off?
            if (_connection.iceConnectionState === 'connected' &&
                _connection.iceGatheringState === 'complete') {

                logger.log('Peer', 'stable connection');

                _self.isConnected = true;
            }
            else {
                //TODO dispatch event saying that this peer is offline
                _self.isConnected = false;
            }

        }

        function channelErrorHandler(e) {
            logger.log('Peer', 'Channel to ' + _self.uuid + ' has an error', e);
        }

        function channelCloseHandler(e) {
            logger.log('Peer', 'Channel to ' + _self.uuid + ' is closed');
            _self.isConnected = false;
        }

        function channelMessageHandler(e) {
            logger.log('Peer', 'received', e.data);
        }

        function channelOpenHandler(e) {
            logger.log('Peer', 'Channel to ' + _self.uuid + ' is open');

            _self.isConnected = true;

            if (_self.isSource) {
                _channel.send('message send to target');
            }

            if (_self.isTarget) {
                _channel.send('message send to source');
            }

        }

        /* Event Handler END */

        //1.Alice creates an RTCPeerConnection object.
        _connection = new MRTCPeerConnection(ICE_SERVER_SETTINGS, OPTIONAL_SETTINGS);

        //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.

        //add listeners to connection
        _connection.ondatachannel = dataChannelHandler;
        _connection.onicecandidate = iceCandidateHandler;
        _connection.oniceconnectionstatechange = iceConnectionStateChangeHandler;
        _connection.onnegotiationneeded = negotiationNeededHandler;


        /**
         * Create a WebRTC-Connection
         *
         * @method createConnection
         * @return {Promise}
         */
        this.createConnection = function () {
            logger.log('Peer', 'creating connection');

            this.isSource = true;
            this.isTarget = false;

            //create  data-channel with a pseudo-random name
            _channel = _connection.createDataChannel('RTCDataChannel' + (Math.random() * 1000 | 0), {
                reliable: false
            });

            //add listeners to channel
            _channel.onclose = channelCloseHandler;
            _channel.onerror = channelErrorHandler;
            _channel.onmessage = channelMessageHandler;
            _channel.onopen = channelOpenHandler;

            var deferred = Q.defer,
                signal = this.getSignalChannel();

            //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
            _connection.createOffer(function (sessionDescription) {

                    //3. Alice calls setLocalDescription() with his offer.)
                    _connection.setLocalDescription(sessionDescription);

                    //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                    signal.sendPeerOffer(_self.uuid, sessionDescription);

                },
                function (err) {
                    logger.log(err);
                },
                MEDIA_CONSTRAINTS);


            return deferred.promise;

        };


        /**
         * @method answerOffer
         * @param data
         * @return {Promise}
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
         *
         * @method acceptConnection
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
         * @method addCandidate
         * @param data
         */
        this.addCandidate = function (data) {
            _connection.addIceCandidate(new MRTCIceCandidate(data.candidate));
        };


        /**
         * Send data via a WebRTC-Channel to a peer
         *
         * @method send
         * @param data
         */
        this.send = function (data) {
            if (!this.isConnected) return;

            _channel.send(data);

        };

        /**
         * Save a reference to a node
         *
         * @method addNodes
         * @param {Array} nodeUuids List of nodeUuids
         */
        this.addNodes = function (nodeUuids) {

            nodeUuids.forEach(function (nodeUuid) {
                //store only if needed, no redundancy
                if (_self.nodes.indexOf(nodeUuid) < 0) {
                    _self.nodes.push(nodeUuid);
                }
            });

        }

    };

    return Peer;
});