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
        computation.start();
        network.broadcastMasterMessage('computation:start');
    };

    module.computation.stop = function () {
        computation.stop();
        network.broadcastMasterMessage('computation:stop');
    };

    module.storage.fs.clear = function () {
        network.broadcastMasterMessage('filesystem:clear');
        return storage.fs.clear();
    };

    module.storage.db.clear = function () {
        network.broadcastMasterMessage('database:clear');
        return storage.db.clear();
    };

    module.storage.clear = function () {
        return module.storage.fs.clear()
            .then(module.storage.db.clear);
    };


    module.client.reload = function (time) {
        time = time || 1500;
        network.broadcastMasterMessage('client:reload', {time: time})
    };

    return module;
});