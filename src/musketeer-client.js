/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */


(function () {

    "use strict";


    //detect if running under node.js environment
    var _isNode = typeof module != 'undefined' && module.exports;

    var musketeer = {
        uid : null
    };

    var _bridge;

    musketeer.init = function (bridge) {
        _bridge = bridge;
        console.log(bridge);
        return this;
    };

    //allow this to be used in node, amd or global
    if (_isNode) {
        module.exports = musketeer;
    }
    else if (typeof define == 'function' && define.amd) {
        define(function () {
            return musketeer;
        })
    }
    else if (typeof window != 'undefined') {
        window.Musketeer = musketeer;
    }

}());