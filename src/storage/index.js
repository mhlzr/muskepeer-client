/**
 * Storage
 * @class Storage
 *
 * https://github.com/jensarps/IDBWrapper
 */

define(['lodash', 'q', 'uuid', 'project', 'musketeer-module', 'idbwrapper'], function (_, Q, uuid, project, MusketeerModule, IDBStore) {

        var STORE_PREFIX = 'Musketeer-',
            EVENT_READY = 'ready',
            ERRORS = {
                DATA_MISSING: 'Data is missing!',
                DATA_EMPTY: 'Data is empty!',
                DATA_NOT_OBJECT: 'Data is not an object!',
                UUID_MISSING: 'Data uuid is missing!',
                UUID_INVALID: 'Data uuid is invalid!',
                STORE_NOT_FOUND: 'Store not found!'
            };

        var module = new MusketeerModule(),
            stores = [];

        createStores().done(function () {
            module.isReady = true;
            module.emit(EVENT_READY);
        });


        function createStores() {
            var storeNames = ['results', 'jobs', 'files'],
                promises = [];

            var deferred;
            storeNames.forEach(function (storeName) {
                    deferred = Q.defer();

                    //create store
                    stores.push(new IDBStore({
                        autoIncrement: false,
                        keyPath: 'uuid',
                        storeName: storeName,
                        storePrefix: STORE_PREFIX,
                        indexes: [
                            { name: 'project', keyPath: 'projectUuid', unique: false, multiEntry: true }
                        ],
                        onStoreReady: deferred.resolve,
                        onError: deferred.reject

                    })
                    );

                    //add promise
                    promises.push(deferred.promise);
                }

            )
            ;

            return Q.all(promises);

        }


        function getStoreByName(name) {
            return _.find(stores, function (store) {
                return store.storeName === name;
            });
        }

        return module.extend({

            isReady: false,

            /**
             * Clear all data from stores
             */
            clear: function () {
                var promises = [];

                var deferred;
                stores.forEach(function (store) {
                    deferred = Q.defer();

                    store.clear(function success() {
                        deferred.resolve();
                    });

                    promises.push(deferred.promise);
                });

                return Q.all(promises);
            },

            /**
             * Read data by key from indexedDB
             * @method read
             * @param storeName
             * @param key
             * @returns {Promise}
             */
            read: function (storeName, key) {
                var deferred = Q.defer(),
                    store = getStoreByName(storeName);


                if (!store) {
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                    return deferred.promise;
                }
                else if (!uuid.isValid(key)) {
                    deferred.reject(ERRORS.UUID_INVALID);
                    return deferred.promise;
                }

                store.get(key, deferred.resolve, deferred.reject);

                return deferred.promise;
            },

            /**
             * Executes a query object
             * @param storeName
             * @param queryObject
             * @returns {Promise}
             */
            find: function (storeName, queryObject) {
                var deferred = Q.defer(),
                    store = getStoreByName(storeName),
                    results = [],
                    queryDefaults = {
                        index: 'project',
                        order: 'ASC',
                        filterDuplicates: false,
                        writeAccess: false,
                        onEnd: function (results) {
                            deferred.resolve(results)
                        },
                        onError: function (error) {
                            deferred.reject(error);
                        }
                    };

                //if nothing was passed
                queryObject = queryObject || {};

                //disallow overwriting callbacks from the outside
                if (queryObject && queryObject.onEnd) queryObject.onEnd = undefined;
                if (queryObject && queryObject.onError) queryObject.onError = undefined;

                //merge with defaults
                queryObject = _.defaults(queryObject, queryDefaults);


                store.iterate(function onItem(item) {
                    deferred.notify(item);
                    results.push(item);
                }, queryObject);

                return deferred.promise;
            },

            /**
             * Save data to indexedDb
             * @param storeName
             * @param data
             * @returns {Promise}
             */
            save: function (storeName, data) {
                var deferred = Q.defer(),
                    store;

                //data is object?
                if (!_.isObject(data)) {
                    deferred.reject(ERRORS.DATA_NOT_OBJECT);
                    return deferred.promise;
                }

                //data is not empty?
                if (_.isEmpty(data)) {
                    deferred.reject(ERRORS.DATA_EMPTY);
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
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                    return deferred.promise;
                }

                //save
                store.put(data, deferred.resolve, deferred.reject);

                return deferred.promise;

            },

            /**
             *
             * @param storeName
             * @param key
             * @returns {Promise}
             */
            remove: function (storeName, key) {
                var deferred = Q.defer(),
                    store = getStoreByName(store);

                //store found?
                if (!store) {
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                }
                //remove
                store.remove(key, deferred.resolve, deferred.reject);

                return deferred.promise();
            },

            /**
             * Update an existing dataset
             * @param storeName
             * @param data
             * @returns {Promise}
             */
            update: function (storeName, data) {
                var store = getStoreByName(storeName),
                    deferred = Q.defer();

                //store found?
                if (!store) {
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                    return deferred.promise;
                }
                //data is not empty?
                else if (_.isEmpty(data)) {
                    deferred.reject(ERRORS.DATA_EMPTY);
                    return deferred.promise;
                }
                //check uuid
                else if (!data.uuid) {
                    deferred.reject(ERRORS.UUID_MISSING);
                    return deferred.promise;
                }
                else if (!uuid.isValid(data.uuid)) {
                    deferred.reject(ERRORS.UUID_INVALID);
                    return deferred.promise;
                }

                //get data from store
                this.read(storeName, data.uuid)
                    //merge
                    .then(function (existingData) {
                        data = _.extend(existingData, data);
                        store.put(data);
                    })
                    //save
                    .then(this.save(storeName, data))
                    .done(function () {
                        deferred.resolve(data);
                    });


                return deferred.promise;
            }

        });
    }
);