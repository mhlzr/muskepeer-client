/**
 *
 * @module Network
 *
 */

define(['lodash', 'q', 'eventemitter2', '../collections/nodes', 'settings'], function (_, Q, EventEmitter2, nodes, settings) {

    var TIMEOUT_WAIT_TIME = 10000, //10s
        ICE_SERVER_SETTINGS = {
            iceServers: [
                { url: settings.stunServer }
            ]},
        OPTIONAL_SETTINGS = {
            optional: [
                {RtpDataChannels: true}
            ]
        },
    //FORCE SCTP
    //OPTIONAL_SETTINGS = null,
        MEDIA_CONSTRAINTS = {
            optional: [],
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        };

    var ee = new EventEmitter2({
        wildcard: true,
        delimiter: ':',
        newListener: false,
        maxListeners: 10
    });

    /**
     * Facade for RTCPeerConnection
     *
     * @private
     * @class MRTCPeerConnection
     * @for Peer
     * @constructor
     */
    function MRTCPeerConnection(ice, optional) {
        if (window.mozRTCPeerConnection) return new mozRTCPeerConnection(ice, optional);
        else if (window.webkitRTCPeerConnection) return new webkitRTCPeerConnection(ice, optional);
        else return new RTCPeerConnection(ice, optional);
    }

    /**
     * Facade for RTCIceCandidate
     *
     * @private
     * @class MRTCIceCandidate
     * @for Peer
     * @constructor
     */
    function MRTCIceCandidate(candidate) {
        if (window.mozRTCIceCandidate) return new mozRTCIceCandidate(candidate);
        else return new RTCIceCandidate(candidate);
    }

    /**
     * Facade for RTCSessionDescription
     *
     * @private
     * @class MRTCSessionDescription
     * @for Peer
     * @constructor
     */
    function MRTCSessionDescription(sdp) {
        if (window.mozRTCSessionDescription) return new mozRTCSessionDescription(sdp);
        else return new RTCSessionDescription(sdp);
    }


    /**
     * A Peer represents another Browser which is connected via
     * WebRTCs DataChannel
     *
     * @class Peer
     * @constructor
     *
     * @param {Object} config
     */
    var Peer = function (config) {

        var _self = this,
            _connection,
            _channel;

        // Event-methods
        this.emit = ee.emit;
        this.on = ee.on;
        this.off = ee.off;
        this.onAny = ee.onAny;

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
         * A timestamp to prove when the last timout
         * occured when trying to connect to the peer.
         * @property timeout
         * @default undefined
         * @type {Number}
         */
        this.timeout = undefined;


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

        /**
         * @private
         * @method timerCompleteHandler
         */
        function timerCompleteHandler(e) {
            if (!_self.isConnected) {
                _self.timeout = Date.now();
                _self.emit('peer:timeout');
                logger.log('Peer', _self.uuid, 'timed out');

            }
            else _self.timeout = undefined;
        }

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
            logger.log('Peer', _self.uuid, 'got remote datachannel');

            _channel = e.channel;

            _channel.onclose = channelCloseHandler;
            _channel.onerror = channelErrorHandler;
            _channel.onmessage = channelMessageHandler;
            _channel.onopen = channelOpenHandler;

        }

        function iceConnectionStateChangeHandler(e) {

            // Everything is fine
            if (_connection.iceConnectionState === 'connected' &&
                _connection.iceGatheringState === 'complete') {

                logger.log('Peer', _self.uuid, 'connection established');
            }
            // Connection has closed
            else if (_connection.iceConnectionState === 'disconnected') {
                logger.log('Peer', _self.uuid, 'connection closed');

                _self.isConnected = false;
                _self.emit('peer:disconnect', _self);
            }


        }

        function channelErrorHandler(e) {
            logger.log('Peer', _self.uuid, 'channel has an error', e);
        }


        function channelMessageHandler(e) {
            var msg;

            if (e.data instanceof Blob) {
                msg = e.data;
            }
            else {
                msg = JSON.parse(e.data);
            }

            _self.emit('peer:message', _.extend(msg, {target: _self}));

        }

        function channelOpenHandler(e) {
            logger.log('Peer', _self.uuid, 'data-channel is open');

            _self.isConnected = true;
            _self.emit('peer:connect', _self);

        }

        function channelCloseHandler(e) {
            logger.log('Peer', _self.uuid, 'data-channel is closed');
            _self.isConnected = false;
            _self.emit('peer:disconnect', _self);
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

            this.isSource = true;
            this.isTarget = false;

            logger.log('Peer', this.uuid, 'creating connection');

            // Start timeout countdown
            _.delay(timerCompleteHandler, TIMEOUT_WAIT_TIME);

            try {
                // Create  data-channel
                _channel = _connection.createDataChannel('Muskepeer', null);
            }
            catch (e) {
                // If an error occured here, there is a problem about the connection,
                // so lets do a timeout and maybe retry later
                this.isConnected = false;
                timerCompleteHandler();
            }


            // Add listeners to channel
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
                    logger.error(err);
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

        };

        /**
         * Send data via a WebRTC-Channel to a peer
         *
         * @method send
         * @param data
         */
        this.send = function (data) {

            if (!_self.isConnected || _channel.readyState !== 'open') {
                logger.error('Peer', 'attempt to send, but channel is not open!');
                return;
            }

            // Actually it should be possible to send a blob
            if (data instanceof Blob) {
                _channel.send(data);
            }
            else {
                try {
                    _channel.send(JSON.stringify(data));
                }
                catch (e) {
                    // logger.log('Peer', e);
                }

            }


        };

        /**
         * @method synchronize
         */
        this.synchronize = function () {

            logger.log('Peer', this.uuid, 'synchronizing');

            this.getNodeList();
            this.getPeerList();
            this.getFileList();
            this.getJobList();
            this.getResultList();
        };


        /* File Exchange */
        this.getFileList = function () {
            this.send({ type: 'file:list:pull'});
        };

        this.sendFileList = function (list) {
            this.send({ type: 'file:list:push', list: list});
        };

        this.getFileByUuid = function (uuids) {
            if (!_.isArray(uuids)) {
                uuids = [uuids];
            }

            uuids.forEach(function (uuid) {
                _self.send({type: 'file:pull', uuid: uuid});
            });
        };

        this.sendFile = function (uuid, chunk, pos) {
            pos = pos || 0;

            // Send as blob, wrapped with info
            if (chunk instanceof Blob) {
                this.send({ type: 'file:push:start', uuid: uuid, pos: pos});
                this.send(chunk);
                this.send({ type: 'file:push:end', uuid: uuid});
            }
            // Send as base64-String, along with info
            else {
                this.send({ type: 'file:push', uuid: uuid, chunk: chunk, pos: pos});
            }

        };

        this.fileReceiveHandler = function () {
        };

        /* Node Exchange */
        this.getNodeList = function () {
            this.send({ type: 'node:list:pull'});
        };

        this.sendNodeList = function (list) {
            this.send({ type: 'node:list:push', list: list});
        };

        this.getNodeByUuid = function (uuids) {
            if (!_.isArray(uuids)) {
                uuids = [uuids];
            }

            uuids.forEach(function (uuid) {
                _self.send({type: 'node:pull', uuid: uuid});
            });
        };

        this.sendNode = function (nodes) {

            if (!_.isArray(nodes)) {
                nodes = [nodes];
            }

            nodes.forEach(function (node) {
                _self.send({type: 'node:push', node: node});
            });
        };


        /* Peer Exchange */
        this.getPeerList = function () {
            this.send({ type: 'peer:list:pull'});
        };

        this.sendPeerList = function (list) {
            //  this.send({ type: 'peer:list:push', list: list});
        };

        this.getPeerByUuid = function (uuids) {
            if (!_.isArray(uuids)) {
                uuids = [uuids];
            }

            uuids.forEach(function (uuid) {
                _self.send({type: 'peer:pull', uuid: uuid});
            });
        };

        this.sendPeer = function (peers) {
            if (!_.isArray(peers)) {
                peers = [peers];
            }

            peers.forEach(function (peer) {
                _self.send({type: 'peer:push', peer: peer});
            });
        };

        /* Job Exchange */
        this.getJobList = function () {
            this.send({ type: 'job:list:pull'});
        };

        this.sendJobList = function (list) {
            this.send({type: 'job:list:push', list: list});
        };

        this.getJobByUuid = function (uuids) {
            if (!_.isArray(uuids)) {
                uuids = [uuids];
            }

            uuids.forEach(function (uuid) {
                _self.send({type: 'job:pull', uuid: uuid});
            });
        };


        this.sendJob = function (jobs) {
            if (!_.isArray(jobs)) {
                jobs = [jobs];
            }

            jobs.forEach(function (job) {
                _self.send({type: 'job:push', job: job});
            });
        };

        /* Result Exchange */
        this.getResultList = function () {
            this.send({ type: 'result:list:pull'});
        };

        this.sendResultList = function (list) {
            var MAX_RESULTS_AT_ONCE = 2;

            //SCTP !!! instead of (S)RTP
            //buffer problem https://code.google.com/p/webrtc/issues/detail?id=2279
            // while (list.length > 0) {
            // _.delay(this.send, Math.random() * 10000, ({type: 'result:list:push', list: list.splice(0, MAX_RESULTS_AT_ONCE)}));
            //      this.send({type: 'result:list:push', list: list.splice(0, MAX_RESULTS_AT_ONCE)});
            //}

            this.send({type: 'result:list:push', list: list});

        };

        this.getResultByUuid = function (uuids) {
            if (!_.isArray(uuids)) {
                uuids = [uuids];
            }

            uuids.forEach(function (uuid) {
                _self.send({type: 'result:pull', uuid: uuid});
            })
        };

        this.sendResult = function (results) {
            if (!_.isArray(results)) {
                results = [results];
            }

            results.forEach(function (result) {
                _self.send({type: 'result:push', result: result});
            });
        };


        this.serialize = function () {
            return{
                uuid: this.uuid,
                location: this.location,
                nodes: this.nodes
            }
        };


        /**
         * @method broadcast
         */
        this.broadcast = function (type, data) {
            _self.send({type: 'broadcast:' + type, data: data});
        }


    };

    return Peer;
});