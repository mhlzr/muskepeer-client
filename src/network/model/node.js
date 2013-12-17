/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['lodash', 'q', 'eventemitter2', 'settings', 'project', 'geolocation'], function (_, Q, EventEmitter2, settings, project, geolocation) {

    var ee = new EventEmitter2({
        wildcard: true,
        delimiter: ':',
        newListener: false,
        maxListeners: 10
    });


    /**
     * @class Node
     * @param config
     * @constructor
     */
    var Node = function (config) {

        var self = this;

        //events
        this.emit = ee.emit;
        this.on = ee.on;
        this.off = ee.off;
        this.onAny = ee.onAny;

        this.host = config.host || 'localhost';
        this.port = config.port || 8080;
        this.isSecure = config.isSecure || false;
        this.url = null; //set via WS
        this.id = 0; //for local use only
        this.uuid = config.uuid;
        this.socket = null;

        this.isConnected = false;

        this.connect = function (callback) {

            try {
                this.socket = new WebSocket((this.isSecure ? 'wss' : 'ws') + '://' + this.host + ':' + this.port);
                this.url = this.socket.url;

                //add listeners
                this.socket.addEventListener('message', this.messageHandler);
                this.socket.addEventListener('open', function () {
                    logger.log('Node' + self.id + ' ' + self.url, 'connected');
                    self.isConnected = true;
                    callback();
                });

                this.socket.addEventListener('error', function (e) {
                    self.disconnect();
                    logger.log('Node' + self.id + ' ' + self.url, 'error');
                });

                this.socket.addEventListener('close', function (e) {
                    self.disconnect();
                    logger.log('Node' + self.id + ' ' + self.url, 'disconnected', e.code + ' : ' + e.reason);

                    switch (e.code) {
                        case 1011 :
                            logger.log('Node' + self.id + ' ' + self.url, 'is idle! Please restart it.');
                            break;
                    }
                });
            }
            catch (e) {
                self.disconnect();
            }

            return this;
        };

        /**
         * @method
         * @chainable
         * @returns {Node}
         */
        this.disconnect = function () {
            this.socket = null;
            this.isConnected = false;
            return this;
        };

        this.send = function (cmd, data, waitForResponse) {

            var deferred = Q.defer();

            if (!this.isConnected) {
                deferred.reject('Not connected to node!');
                return deferred.promise;
            }

            if (!data || !_.isObject(data) || _.isEmpty(data)) {
                deferred.reject('Data is not an object/empty!');
                return deferred.promise;
            }

            if (!cmd) {
                deferred.reject('Command is not defined!');
                return deferred.promise;
            }

            //add cmd to data
            data.cmd = cmd;
            //add auth token
            data.authToken = settings.authToken;

            //send data to websocket as String
            this.socket.send(JSON.stringify(data));


            //if we need to wait for the answer
            if (waitForResponse) {
                this.socket.addEventListener('message', function (e) {
                    //TODO change this to be able to unregister eventListener
                    var response = JSON.parse(e.data);
                    if (response.cmd === cmd) deferred.resolve(response.data);
                })
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        this.sendAuthentication = function () {
            return geolocation.getGeoLocation()
                .then(function (location) {
                    return self.send('peer:auth', {uuid: settings.uuid, location: location}, true);
                });

        };

        this.sendPeerOffer = function (targetPeerUuid, offer) {

            return geolocation.getGeoLocation()
                .then(function (location) {
                    self.send('peer:offer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, location: location}, false);
                });
        };

        this.sendPeerAnswer = function (targetPeerUuid, answer) {
            return this.send('peer:answer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer}, false);
        };

        this.sendPeerCandidate = function (targetPeerUuid, candidate) {
            return this.send('peer:candidate', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, candidate: candidate}, false);
        };

        this.getAllRelatedPeers = function () {
            return this.send('peer:list', {projectUuid: project.uuid}, true);
        };


        this.messageHandler = function (e) {
            var data = JSON.parse(e.data),
                cmd = data.cmd;

            logger.log('Node' + self.id, 'received', data);

            switch (cmd.toLowerCase()) {
                case 'peer:offer' :
                    self.emit('peer:offer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer, location: data.data.location});
                    break;
                case 'peer:answer' :
                    self.emit('peer:answer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer});
                    break;
                case 'peer:candidate' :
                    self.emit('peer:candidate', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, candidate: data.data.candidate});
                    break;
            }
        }

    };

    return Node;
});