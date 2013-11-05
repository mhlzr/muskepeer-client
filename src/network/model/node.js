/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['lodash', 'q', 'settings', 'project'], function (_, Q, settings, project) {

    var _self,
        _socket;

    function messageHandler(e) {
        var data = JSON.parse(e.data);
        console.log('RECEIVED:', data);
    }

    var Node = function (config) {

        _self = this;

        this.host = config.host || 'localhost';
        this.port = config.port || 8080;
        this.uuid = config.uuid;

        this.isConnected = false;

        this.connect = function (callback) {

            _socket = new WebSocket('ws://' + this.host + ':' + this.port);

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
            return this.send('peer:auth', {uuid: settings.uuid, authToken: settings.authToken, location: {lat: 0, long: 0}}, true);
        };

        this.getAllRelatedPeers = function () {
            return this.send('peer:list', {projectUuid: project.uuid}, true);
        }

    };

    return Node;
});