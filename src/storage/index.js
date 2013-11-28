/**
 * Storage
 * @class Storage
 *
 * @see https://github.com/jensarps/IDBWrapper
 */

define(['lodash', 'q', 'uuid', 'project', 'muskepeer-module', 'idbwrapper'], function (_, Q, uuid, project, MuskepeerModule, IDBStore) {

        var STORE_PREFIX = 'Muskepeer-',
            EVENT_READY = 'ready',
            ERRORS = {
                DATA_MISSING: 'Data is missing!',
                DATA_EMPTY: 'Data is empty!',
                DATA_NOT_OBJECT: 'Data is not an object!',
                UUID_MISSING: 'Data uuid is missing!',
                UUID_INVALID: 'Data uuid is invalid!',
                STORE_NOT_FOUND: 'Store not found!'
            };

        var module = new MuskepeerModule(),
            stores = [];

        createStores().done(function () {
            module.isReady = true;
            module.emit(EVENT_READY);
        });


        function createStores() {
            var storeNames = ['results', 'jobs', 'files', 'nodes'],
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
             * LIst all items from a store
             * @param storeName
             * @param options
             * @param keyRangeOptions
             * @param filterObject
             * @returns {Promise}
             */
            list: function (storeName, options, keyRangeOptions, filterObject) {
                var deferred = Q.defer(),
                    store = getStoreByName(storeName),
                    results = [],
                    defaultOptions = {
                        index: 'project',
                        order: 'ASC',
                        filterDuplicates: false,
                        writeAccess: false,
                        onEnd: function () {
                            deferred.resolve(results)
                        },
                        onError: function (error) {
                            deferred.reject(error);
                        }
                    };


                //if nothing was passed
                options = options || {};

                //disallow overwriting callbacks from the outside
                if (options && options.onEnd) options.onEnd = undefined;
                if (options && options.onError) options.onError = undefined;

                //merge with defaults
                options = _.defaults(options, defaultOptions);

                //add keyRange if passed
                if (keyRangeOptions) {
                    options.keyRange = store.makeKeyRange(keyRangeOptions);
                }

                store.iterate(function onItem(item) {

                    //test/reduce the found objects
                    if (filterObject) {
                        for (var key in filterObject) {
                            //does the property exist?
                            if (!item.hasOwnProperty(key)) {
                                return;
                            }
                            else {
                                //do the values match?
                                if (item[key] !== filterObject[key]) {
                                    return;
                                }
                            }
                        }
                    }

                    deferred.notify(item);
                    results.push(item);

                }, options);

                return deferred.promise;
            },

            /**
             * Uses list() and reduces matches by indexedDB.keyranges
             * @param storeName
             * @param options
             * @param keyRangeOptions
             * @returns {Promise}
             */
            findAndReduceByKeyRange: function (storeName, options, keyRangeOptions) {
                return this.list(storeName, options, keyRangeOptions);
            },

            /**
             * Uses list() and reduces matches by a filterObject
             * @param storeName
             * @param options
             * @param filterObject
             * @returns {Promise}
             */
            findAndReduceByObject: function (storeName, options, filterObject) {
                return this.list(storeName, options, null, filterObject);
            },

            /**
             * Save data to indexedDb, if not uuid is set it will be added automatically
             * @param storeName
             * @param data
             * @param options
             * @returns {Promise}
             */
            save: function (storeName, data, options) {
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

                //search if data is already existent
                if (!options.allowDuplicates) {
                    var clone = {};

                    //can't just Object.create/clone here, because you
                    //can't delete the uuid
                    for (var key in data) {
                        if (key !== 'uuid' && data.hasOwnProperty(key)) {
                            clone[key] = data[key];
                        }
                    }
                    module.findAndReduceByObject(storeName, null, clone).then(function (results) {
                        //not found in db
                        if (_.isEmpty(results)) {
                            //save
                            store.put(data, deferred.resolve, deferred.reject)
                        }
                        //already got such an entry
                        else {
                            deferred.reject();
                        }
                    });
                }
                else {
                    //save without check
                    store.put(data, deferred.resolve, deferred.reject);
                }


                return deferred.promise;

            },

            /**
             * Save Mutiple objects to a shared store
             * @param storeName
             * @param datasets Array
             * @param options
             * @returns {Promise}
             */
            saveMultiple: function (storeName, datasets, options) {
                var promises = [];

                datasets.forEach(function (dataset) {
                    promises.push(module.save(storeName, dataset, options));
                });

                return Q.all(promises);
            },

            /**
             * Remove an existing dataset
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

        })
            ;
    }
)
;