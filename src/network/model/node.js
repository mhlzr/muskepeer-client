/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['socket-io', 'settings'], function (io, settings) {

    var socket;

    var Node = function (host, port) {

        var self = this;

        this.isConnected = false;

        this.connect = function (callback) {

            socket = io.connect(host + ':' + port);

            socket.on('connect', function () {
                self.isConnected = true;

                //send uuid
                self.send('auth', settings.uuid);
                callback();
            });

            return this;
        };

        this.disconnect = function () {
            socket = null;
            self.isConnected = false;
        };

        this.send = function (cmd, params) {
            if (!self.isConnected) return this;
            socket.emit({
                'cmd': 'list',
                'params': 'peers'
            });
            return this;
        };

        this.getAllPeers = function (callback) {
            console.log('getting peers');
            self.send('list', 'peers');

            callback(['peer']);
            return this;
        }

    };

    return Node;
});