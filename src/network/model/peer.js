/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['q'], function (Q) {


    function createOffer() {

        //emit('webrtc:offer')
    }

    function createAnswer() {
    }

    var Peer = function (config) {

        this.uuid = config.uuid;
        this.location = config.location;
        this.nodes = config.nodes;

        console.log('PeerConfig: ', config);

        this.connect = function () {
            var deferred = Q.defer;
            return deferred.promise;
        };

        this.send = function () {

        }
    };

    return Peer;
});