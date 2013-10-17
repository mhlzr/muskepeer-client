/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

define([
    './computation/index',
    './crypto/index',
    './network/index',
    './settings',
    './states',
    './storage/index'
], function (computation, crypto, network, settings, states, storage) {

    "use strict";


    var musketeer = {

        init: function () {

            function testRequirements() {
                return JSON && localStorage && Object.observe && indexedDB;
            }

            return this;
        },

        computation: computation,
        crypto: crypto,
        network: network,
        settings: settings,
        states: states,
        storage: storage

    };


    musketeer.computation.on('task:start', function (e) {
        console.log('start');
    });


    musketeer.network.on('node:connected', function (e) {
        console.log('node:connected');
    });

    musketeer.network.on('node:disconnected', function (e) {
        console.log('node:disconnected');
    });

    musketeer.network.on('p2p:connected', function (e) {
        console.log('p2p:connected');
    });

    musketeer.network.on('p2p:disconnected', function (e) {
        console.log('p2p:disconnected');
    });


    return musketeer;

});