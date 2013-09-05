/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

(function (socket) {

    //if running under node.js load
   // https://github.com/LearnBoost/socket.io-client

    var bridge = {
    };


    bridge.init = function (bridge) {
        _bridge = bridge;
        console.log(bridge);
        return this;
    };

    bridge.broadcast = function(type, data){};
    bridge.send = function(peerId, type, data){};
    bridge.emit = bridge.send;

    bridge.on = function(event, callback){};


}());