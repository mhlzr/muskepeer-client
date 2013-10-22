/**
 * Storage
 * @module Storage
 *
 * https://github.com/jensarps/IDBWrapper
 */

define(['lodash', 'q', 'uuid', 'project', 'musketeer-module', 'idbwrapper'], function (_, Q, uuid, project, MusketeerModule, IDBStore) {

    var module = new MusketeerModule(),
        isReady = false,
        stores = [];

    createStores().then(function () {
        isReady = true
    });

    function createStores() {
        var storeNames = ['results', 'jobs', 'files'],
            promises = [];

        var deferred, s;
        storeNames.forEach(function (storeName) {
            deferred = Q.defer();

            //create store
            s = new IDBStore({
                autoIncrement: false,
                keyPath: 'uuid',
                storeName: storeName,
                storePrefix: 'Musketeer-',
                indexes: [
                    { name: 'project', keyPath: 'projectUuid', unique: false, multiEntry: true }
                ]
            }, deferred.resolve, deferred.reject('Error creating store'));

            stores.push(s);

            promises.push(deferred.promise);
        });

        return Q.all(promises);

    }


    function getStoreByName(name) {
        return _.find(stores, function (store) {
            return store.storeName === name;
        });
    }

    return module.extend({

        /**
         * Read data from indexedDB
         * @param storeName
         * @param key
         * @returns {promise|*}
         */
        read: function (storeName, key) {
            var deferred = Q.defer(),
                store = getStoreByName(storeName);

            store.get(key, deferred.resolve, deferred.reject);

            return deferred.promise;
        },

        /**
         * Save data to indexedDb
         * @param storeName
         * @param data
         * @returns {promise|*}
         */
        save: function (storeName, data) {
            var deferred = Q.defer(),
                store;

            //data is object?
            if (!_.isObject(data)) {
                deferred.reject('Data must be an object');
                return deferred.promise;
            }

            //data is not empty?
            if (_.isEmpty(data)) {
                deferred.reject('Data is empty');
                return deferred.promise;
            }

            //data has uuid?
            if (!data.uuid || !uuid.isValid(data.uuid)) {
                data.uuid = uuid.generate();
            }

            //add project uuid
            data.projectUuid = project.uuid;

            store = getStoreByName(storeName);

            //store found?
            if (!store) {
                deferred.reject('Store not found');
                return deferred.promise;
            }

            store.put(data, deferred.resolve, deferred.reject);

            return deferred.promise;

        },
        remove: function (storeName, key) {
            //TODO implement
        },
        update: function (storeName, key, data) {
            //TODO implement
        }

    });
});