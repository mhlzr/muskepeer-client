/**
 * @module Mediator
 * @class Mediator
 */

define(['computation/index', 'network/index', 'storage/index'],

    function (computation, network, storage) {

        return {

            /**
             * @method couple
             */
            couple: function () {

                network.on('broadcast:computation:start', computation.start);
                network.on('broadcast:computation:stop', computation.stop);

                computation.on('job:lock', function (e) {
                    network.publish('job:lock', e);
                });
                computation.on('job:complete', function (e) {
                    network.publish('job:complete', e);
                });
                computation.on('job:unlock', function (e) {
                    network.publish('job:complete', e);
                });
                computation.on('job:push', function (e) {
                    network.publish('job:complete', e);
                });
                computation.on('result:push', function (e) {
                    network.publish('result:push', e);
                });

            },

            /**
             * @method decouple
             */
            decouple: function () {
                network.removeAllListeners();
                computation.removeAllListeners();
            }
        };
    });