/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['lodash', 'q', 'eventemitter2', 'settings', 'project'], function (_, Q, EventEmitter2, settings, project) {

    var _self,
        _socket,
        ee = new EventEmitter2({
            wildcard: true,
            delimiter: ':',
            newListener: false,
            maxListeners: 10
        });

    function messageHandler(e) {
        var data = JSON.parse(e.data),
            cmd = data.cmd;

        logger.log('Node received', data);

        switch (cmd.toLowerCase()) {
            case 'peer:offer' :
                _self.emit('peer:offer', {nodeUuid: _self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer});
                break;
            case 'peer:answer' :
                _self.emit('peer:answer', {nodeUuid: _self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer});
                break;
        }
    }

    var Node = function (config) {

        _self = this;

        //events
        this.emit = ee.emit;
        this.on = ee.on;
        this.off = ee.off;
        this.onAny = ee.onAny;

        this.host = config.host || 'localhost';
        this.port = config.port || 8080;
        this.url = null; //set via WS
        this.uuid = config.uuid;

        this.isConnected = false;

        this.connect = function (callback) {

            _socket = new WebSocket('ws://' + this.host + ':' + this.port);

            _self.url = _socket.url;

            //add listeners
            _socket.addEventListener('message', messageHandler);
            _socket.addEventListener('open', function () {
                _self.isConnected = true;
                callback();
            });

            _socket.addEventListener('close', function (e) {
                _self.disconnect();
                console.info('Connection closed.', e.reason);
            });

            return this;
        };

        this.disconnect = function () {
            _socket = null;
            _self.isConnected = false;
            return _self;
        };

        this.send = function (cmd, data, waitForResponse) {


            var deferred = Q.defer();

            if (!_self.isConnected) {
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
            _socket.send(JSON.stringify(data));


            //if we need to wait for the answer
            if (waitForResponse) {
                _socket.addEventListener('message', function (e) {
                    //TODO change this to be abale to unregister eventListener
                    var response = JSON.parse(e.data);
                    if (response.cmd === cmd) deferred.resolve(response.data);
                })
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        this.sendAuthentication = function () {
            return this.send('peer:auth', {uuid: settings.uuid, location: {lat: 0, long: 0}}, true);
        };

        this.sendPeerOffer = function (targetPeerUuid, offer) {
            return this.send('peer:offer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer}, false);
        };

        this.sendPeerAnswer = function (targetPeerUuid, answer) {
            return this.send('peer:answer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer}, false);
        };

        this.getAllRelatedPeers = function () {
            return this.send('peer:list', {projectUuid: project.uuid}, true);
        }

    };

    return Node;
});