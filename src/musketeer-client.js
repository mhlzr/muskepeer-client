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

    console.log(computation);

    var musketeer = {

        init: function (bridge) {

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


    /**
     * EXPORT


     //allow this to be used in node, amd or global

     if (typeof module != 'undefined' && module.exports && process) {
        module.exports = musketeer;
    }
     else if (typeof define == 'function' && define.amd) {
        return musketeer;

    }
     else if (typeof window != 'undefined') {
        window.Musketeer = musketeer;
    }
     */

    return musketeer;
}());