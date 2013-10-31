/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['lodash', 'q', 'settings', 'project'], function (_, Q, settings, project) {

    var _self,
        _socket;

    function messageHandler(e) {
        var data = JSON.parse(e.data);
        console.log(data);
    }

    var Node = function (host, port) {

        _self = this;

        this.isConnected = false;

        this.connect = function (callback) {


            _socket = new WebSocket('ws://' + host + ':' + port);

            //add listeners
            _socket.addEventListener('message', messageHandler);
            _socket.addEventListener('open', function () {
                _self.isConnected = true;
                callback();
            });

            _socket.addEventListener('close', function () {
                _self.isConnected = false;
                console.log('CLOSED');
            });


            return this;
        };

        this.disconnect = function () {
            _socket = null;
            _self.isConnected = false;
            return _self;
        };

        this.send = function (cmd, data) {
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

            _socket.send(JSON.stringify(data));

            deferred.resolve();

            return deferred.promise;
        };

        this.sendAuthentication = function () {
            return this.send('peer:auth', {uuid: settings.uuid, location: {lat: 0, long: 0}});


        };

        this.getAllPeers = function () {
            return this.send('peer:list', {projectUuid: project.uuid});
        }

    };

    return Node;
});