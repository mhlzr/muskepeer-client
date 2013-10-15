/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

define([
    './computation/index',
    './network/index',
    './settings',
    './states',
    './storage/index'
], function (computation, network, settings, states, storage) {

    "use strict";


    var musketeer = {

        init: function () {

            function testRequirements() {
                return JSON && localStorage && Object.observe && indexedDB;
            }

            return this;
        },

        computation: computation,
        network: network,
        settings: settings,
        states: states,
        storage: storage

    };


    musketeer.computation.on('task:start', function (e) {
        console.log('start');
    });


    return musketeer;

});