/**
 *
 * @module Network
 *
 */

define(['lodash', 'q', 'eventemitter2', '../collections/nodes', 'settings', 'project'], function (_, Q, EventEmitter2, nodes, settings, project) {

    var TIMEOUT_WAIT_TIME = 10000, //10s
        QUEUE_RETRY_TIME = 75,
        ICE_SERVER_SETTINGS = {
            iceServers: settings.iceServers
        };

// a.k.a mediaConstraint
    var connectionConstraint = {
            optional: [
                {RtpDataChannels: true},
                {DtlsSrtpKeyAgreement: true}
            ],
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        },
        channelConstraint = {
        },
        ee = new EventEmitter2({
            wildcard: true,
            delimiter: ':',
            newListener: false,
            maxListeners: 10
        });

// Handle vendor prefixes
    if (window.webkitRTCPeerConnection) {
        RTCPeerConnection = webkitRTCPeerConnection;
        RTCIceCandidate = window.RTCIceCandidate;
        RTCSessionDescription = window.RTCSessionDescription;
    } else if (window.mozRTCPeerConnection) {
        RTCPeerConnection = mozRTCPeerConnection;
        RTCIceCandidate = mozRTCIceCandidate;
        RTCSessionDescription = mozRTCSessionDescription;
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

        var _self = this;

        this.id = config.id;


        // Event-methods
        this.emit = ee.emit;
        this.on = ee.on;
        this.off = ee.off;
        this.onAny = ee.onAny;

        /**
         * @property connection
         * @type {RTCPeerCpnnection}
         */
        this.connection = undefined;

        /**
         * @property channel
         * @type {RTCDataChannel}
         */
        this.channel = undefined;

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
         * List of timers for synchronization
         * @type {Array}
         */
        this.syncTimers = [];


        /**
         * Indicator to tell which protocol is currently used
         * SCTP or SRTP
         *
         * @property protocol
         * @default undefined
         * @type {String}
         */
        this.protocol = undefined;


        // Protocol switch SRTP(=default) or SCTP
        if (settings.protocol.toLowerCase() === 'sctp') {
            this.protocol = 'sctp';
            logger.log('Peer ' + _self.id, 'Using SCTP');

            connectionConstraint = {
                optional: [
                    {RtpDataChannels: false},
                    {DtlsSrtpKeyAgreement: true}
                ],
                mandatory: {
                    OfferToReceiveAudio: false,
                    OfferToReceiveVideo: false
                }
            };

            channelConstraint = {
                reliable: false,
                maxRetransmits: 0
            };
        } else {
            this.protocol = 'srtp';
            logger.log('Peer ' + _self.id, 'Using SRTP');
        }


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
                _self.emit('peer:timeout', _self);
            }
            else _self.timeout = undefined;
        }

        /* Event Handler Start */
        function iceCandidateHandler(e) {
            //II. The handler is called when network candidates become available.
            if (!e || !e.candidate) return;

            // III. In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
            _self.getSignalChannel().sendPeerCandidate(_self.uuid, e.candidate);

        }

        function dataChannelHandler(e) {
            logger.log('Peer ' + _self.id, 'Received remote DataChannel');

            _self.channel = e.channel;

            _self.channel.onclose = channelCloseHandler;
            _self.channel.onerror = channelErrorHandler;
            _self.channel.onmessage = channelMessageHandler;
            _self.channel.onopen = channelOpenHandler;

        }

        function iceConnectionStateChangeHandler(e) {

            // Everything is fine
            if (_self.connection.iceConnectionState === 'connected' &&
                _self.connection.iceGatheringState === 'complete') {

                logger.log('Peer ' + _self.id, 'Connection established');
            }
            // Connection has closed
            else if (_self.connection.iceConnectionState === 'disconnected') {
                logger.log('Peer ' + _self.id, 'Connection closed');

                _self.isConnected = false;
                _self.emit('peer:disconnect', _self);
            }


        }

        function negotiationNeededHandler(e) {

            logger.log('Peer ' + _self.id, 'Negotiation needed');

            //2. Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
            _self.connection.createOffer(function (sessionDescription) {

                    //3. Alice calls setLocalDescription() with his offer.)
                    _self.connection.setLocalDescription(sessionDescription);

                    //4. Alice stringifies the offer and uses a signaling mechanism to send it to Eve.
                    _self.getSignalChannel().sendPeerOffer(_self.uuid, sessionDescription);

                },
                function (err) {
                    logger.error('Peer ' + _self.id, err, 'Was using', _self.protocol, 'protocol.');
                },
                connectionConstraint);
        }


        function signalingStateChangeHandler(e) {
        }

        function channelErrorHandler(e) {
            logger.log('Peer ' + _self.id, 'Channel has an error', e);
        }


        function channelMessageHandler(e) {
            var msg;

            _self.isConnected = true;

            if (e.data instanceof Blob) {
                msg = {blob: e.data};
            }
            else {
                try {
                    msg = JSON.parse(e.data);
                }
                catch (err) {
                    logger.error('Peer ' + _self.id, 'Error parsing msg:', e.data);
                }

            }

            _self.emit('peer:message', _.extend(msg, {target: _self}));


        }

        function channelOpenHandler(e) {
            logger.log('Peer ' + _self.id, 'DataChannel is open');

            _self.isConnected = true;
            _self.emit('peer:connect', _self);

        }

        function channelCloseHandler(e) {
            logger.log('Peer ' + _self.id, 'DataChannel is closed', e);
            _self.isConnected = false;
            _self.emit('peer:disconnect', _self);
        }

        /* Event Handler END */


        /**
         * Create a WebRTC-Connection
         *
         * @method createConnection
         * @return {Promise}
         */
        this.createConnection = function () {


            this.isSource = true;
            this.isTarget = false;

            logger.log('Peer ' + _self.id, 'Creating connection');

            //1.Alice creates an RTCPeerConnection object.
            _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);

            //I. Alice creates an RTCPeerConnection object with an onicecandidate handler.

            //Add listeners to connection
            _self.connection.ondatachannel = dataChannelHandler;
            _self.connection.onicecandidate = iceCandidateHandler;
            _self.connection.oniceconnectionstatechange = iceConnectionStateChangeHandler;
            _self.connection.onnegotiationneeded = negotiationNeededHandler;
            _self.connection.onsignalingstatechange = signalingStateChangeHandler;


            // Start timeout countdown
            _.delay(timerCompleteHandler, TIMEOUT_WAIT_TIME);

            try {
                // Create  data-channel
                _self.channel = _self.connection.createDataChannel('Muskepeer', channelConstraint);
            }
            catch (e) {
                // If an error occured here, there is a problem about the connection,
                // so lets do a timeout and maybe retry later
                this.isConnected = false;
                timerCompleteHandler();
                deferred.reject();
            }


            // Add listeners to channel
            _self.channel.onclose = channelCloseHandler;
            _self.channel.onerror = channelErrorHandler;
            _self.channel.onmessage = channelMessageHandler;
            _self.channel.onopen = channelOpenHandler;


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

            _self.connection = new RTCPeerConnection(ICE_SERVER_SETTINGS, connectionConstraint);
            _self.connection.ondatachannel = dataChannelHandler;
            _self.connection.onicecandidate = iceCandidateHandler;
            _self.connection.oniceconnectionstatechange = iceConnectionStateChangeHandler;
            _self.connection.onnegotiationneeded = negotiationNeededHandler;
            _self.connection.onsignalingstatechange = signalingStateChangeHandler;

            this.connection = _self.connection;

            //5. Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
            _self.connection.setRemoteDescription(new RTCSessionDescription(data.offer), function () {

                //6. Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
                _self.connection.createAnswer(function (sessionDescription) {

                        //7. Eve sets her answer as the local description by calling setLocalDescription().
                        _self.connection.setLocalDescription(sessionDescription);

                        //8. Eve then uses the signaling mechanism to send her stringified answer back to Alice.
                        signal.sendPeerAnswer(uuid, sessionDescription);

                    },
                    function (err) {
                        logger.log(err);
                    },
                    connectionConstraint);

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
            _self.connection.setRemoteDescription(new RTCSessionDescription(data.answer));

        };

        /**
         * Add candidate info to connection
         * @method addCandidate
         * @param data
         */
        this.addCandidate = function (data) {
            _self.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
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
         * @param {Boolean} reliable Should a retry occur if the transmission fails?
         */
        this.send = function (data, reliable) {

            reliable = reliable || false;

            var jsonString;

            if (!_self.isConnected || _self.channel.readyState !== 'open') {
                logger.error('Peer ' + _self.id, 'Attempt to send, but channel is not open!');
                return;
            }


            // Actually it should be possible to send a blob, but it isn't
            // https://code.google.com/p/webrtc/issues/detail?id=2276
            if (data instanceof Blob) {
                _self.channel.send(data);
            }
            else {
                // Currently JSON & Channel.send error produce a SyntaxError
                // https://code.google.com/p/webrtc/issues/detail?id=2434
                try {
                    jsonString = JSON.stringify(data);
                }
                catch (e) {
                    // We won't retry as this always will fail
                }
                try {
                    _self.channel.send(jsonString);
                }
                catch (e) {
                    if (reliable) {
                        logger.error('Peer ' + _self.id, 'Error while sending reliable msg, queuing data');
                        // Retry again
                        _.delay(_self.send, QUEUE_RETRY_TIME, data);
                    }
                }
            }

        };

        /**
         * @method synchronize
         */
        this.synchronize = function () {

            logger.log('Peer ' + _self.id, 'Synchronizing');

            if (project.network.synchronization.nodes.enabled) {
                this.syncTimers.push(setInterval(project.network.synchronization.nodes.interval, this.getNodeList));
                this.getNodeList();
            }
            if (project.network.synchronization.peers.enabled) {
                this.syncTimers.push(setInterval(project.network.synchronization.peers.interval, this.getPeerList))
                this.getPeerList();
            }
            if (project.network.synchronization.files.enabled) {
                this.syncTimers.push(setInterval(project.network.synchronization.files.interval, this.getPeerList))
                this.getFileList();
            }
            if (project.network.synchronization.jobs.enabled) {
                this.syncTimers.push(setInterval(project.network.synchronization.jobs.interval, this.getPeerList))
                this.getJobList();
            }
            if (project.network.synchronization.results.enabled) {
                this.syncTimers.push(setInterval(project.network.synchronization.results.interval, this.getPeerList))
                this.getResultList();
            }


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


        /* Node Exchange */
        this.getNodeList = function () {
            _self.send({ type: 'node:list:pull'});
        };

        this.sendNodeList = function (list) {
            while (list.length > 0) {
                this.send({type: 'node:list:push', list: list.splice(0, project.network.synchronization.nodes.groupSize)});
            }
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
            while (list.length > 0) {
                this.send({type: 'peer:list:push', list: list.splice(0, project.network.synchronization.peers.groupSize)});
            }
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
            while (list.length > 0) {
                this.send({type: 'job:list:push', list: list.splice(0, project.network.synchronization.jobs.groupSize)});
            }
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
            while (list.length > 0) {
                this.send({type: 'result:list:push', list: list.splice(0, project.network.synchronization.results.groupSize)});
            }
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


        /**
         * @method serialize
         * @return {Object}
         */
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

            // Add broadcast prefix?
            if (type.indexOf('broadcast:') < 0) {
                type = 'broadcast:' + type;
            }

            _self.send({type: type, data: data});
        };


        /**
         * @method disconnect
         */
        this.disconnect = function () {
            _self.isConnected = false;
            _self.channel.close();
            _self.connection.close();
        }


    };
    return Peer;
})
;