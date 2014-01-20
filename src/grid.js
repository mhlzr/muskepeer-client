/**
 *
 *
 * @module control
 * @class control
 */

define(['network/index', 'computation/index', 'storage/index'], function (network, computation, storage) {

    var module = {
        computation: {},
        storage: { fs: {}, db: {}},
        client: {}
    };

    module.computation.start = function () {
        network.broadcastMasterMessage('computation:start');
        computation.start();
    };

    module.computation.stop = function () {
        network.broadcastMasterMessage('computation:stop');
        computation.stop();
    };

    module.storage.fs.clear = function () {
        storage.fs.clear();
        network.broadcastMasterMessage('filesystem:clear');
    };

    module.storage.db.clear = function () {
        storage.db.clear();
        network.broadcastMasterMessage('database:clear');
    };

    module.storage.clear = function () {
        module.storage.fs.clear();
        module.storage.db.clear();
    };


    module.client.reload = function (time) {
        time = time || 1500;
        network.broadcastMasterMessage('client:reload', {time: time})
    };

    return module;
});