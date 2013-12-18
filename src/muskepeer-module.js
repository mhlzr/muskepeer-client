/**
 * Created by Matthieu Holzer on 15.10.13.
 * @module MuskepeerModule
 * @class MuskepeerModule
 * @constructor
 */
define(['lodash', 'eventemitter2'], function (_, EventEmitter2) {

    var Module,
        ee = new EventEmitter2({
            wildcard: true, // should the event emitter use wildcards.
            delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
            newListener: false, // if you want to emit the newListener event set to true.
            maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.
        });

    Module = function () {
        var self = this;
        this.extend = function (obj) {
            return _.extend(self, obj);
        };
        this.emit = ee.emit;
        this.on = ee.on;
        this.off = ee.off;
    };


    return Module;

});