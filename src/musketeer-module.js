/**
 * Created by Matthieu Holzer on 15.10.13.
 */
define(['lodash', 'eventemitter2'], function (_, EventEmitter2) {
    return {
        extend: function (obj) {
            return _.extend(new EventEmitter2({

                wildcard: true, // should the event emitter use wildcards.
                delimiter: ':', // the delimiter used to segment namespaces, defaults to `.`.
                newListener: false, // if you want to emit the newListener event set to true.
                maxListeners: 10 // the max number of listeners that can be assigned to an event, defaults to 10.


            }), obj);
        }

    };
});