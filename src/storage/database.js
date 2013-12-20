/**
 * Database
 *
 * @module Storage
 * @class Database
 * @submodule Database
 *
 * @see https://github.com/jensarps/IDBWrapper
 */

define(['lodash', 'q', 'uuid', 'project', 'idbwrapper'], function (_, Q, uuid, project, IDBStore) {

        var STORE_PREFIX = 'Muskepeer-',

            ERRORS = {
                DATA_MISSING: 'Data is missing!',
                DATA_EMPTY: 'Data is empty!',
                DATA_NOT_OBJECT: 'Data is not an object!',
                UUID_MISSING: 'Data uuid is missing!',
                UUID_INVALID: 'Data uuid is invalid!',
                STORE_NOT_FOUND: 'Store not found!'
            };

        var _self,
            _stores = [];

        /**
         * Create needed indexedDB-Stores
         * @private
         * @method createStores
         * @return {Promise}
         */
        function createStores() {
            var storeNames = ['results', 'jobs', 'files', 'nodes'],
                promises = [];

            var deferred;
            storeNames.forEach(function (storeName) {
                    deferred = Q.defer();

                    //create store
                    _stores.push(
                        new IDBStore({
                            autoIncrement: false,
                            keyPath: 'uuid',
                            storeName: storeName,
                            storePrefix: STORE_PREFIX,
                            indexes: [
                                {
                                    name: 'project',
                                    keyPath: 'projectUuid',
                                    unique: false,
                                    multiEntry: true
                                }
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

        /**
         * @private
         * @method getStoreByBame
         * @param {String} name
         * @return {Object}
         */
        function getStoreByName(name) {
            return _.find(_stores, function (store) {
                return store.storeName === name;
            });
        }

        return {

            init: function () {
                _self = this;
                return createStores();
            },

            /**
             * Clear all data from stores
             * @method clear
             * @return {Promise}
             */
            clear: function () {
                var promises = [];

                var deferred;
                _stores.forEach(function (store) {
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
             * @param {String} storeName
             * @param {String} key
             * @param {Object} [options]
             * @return {Promise}
             */
            read: function (storeName, key, options) {
                var deferred = Q.defer(),
                    store = getStoreByName(storeName);

                options = options || {};

                if (!store) {
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                    return deferred.promise;
                }
                else if (!options.uuidIsHash && !uuid.isValid(key)) {
                    deferred.reject(ERRORS.UUID_INVALID);
                    return deferred.promise;
                }

                store.get(key, deferred.resolve, deferred.reject);

                return deferred.promise;
            },

            /**
             * List all items from a store
             * @method list
             *
             * @param {String} storeName
             * @param {Object} [options]
             * @param {Object} [keyRangeOptions]
             * @param {Object} [filterObject]
             *
             * @return {Promise}
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
             *
             * @method findAndReduceByKeyRange
             *
             * @param {String} storeName
             * @param {Object} options
             * @param {Object} keyRangeOptions
             * @return {Promise}
             */
            findAndReduceByKeyRange: function (storeName, options, keyRangeOptions) {
                return this.list(storeName, options, keyRangeOptions);
            },

            /**
             * Uses list() and reduces matches by a filterObject
             *
             * @method findAndReduceByObject
             *
             * @param {String} storeName
             * @param {Object} options
             * @param {Object} filterObject
             * @return {Promise}
             */
            findAndReduceByObject: function (storeName, options, filterObject) {
                return this.list(storeName, options, null, filterObject);
            },

            /**
             * Save data to indexedDb, if not uuid is set it will be added automatically
             *
             * @method save
             *
             * @param {String} storeName
             * @param {Object} data
             * @param {Object} options
             * @return {Promise}
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
                if (!options.uuidIsHash && (!data.uuid || !uuid.isValid(data.uuid))) {
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
                    _self.findAndReduceByObject(storeName, null, clone).then(function (results) {
                        //not found in db
                        if (_.isEmpty(results)) {
                            //save
                            store.put(data, deferred.resolve, function onError(e) {
                                deferred.reject(e);
                            })
                        }
                        //already got such an entry
                        else {
                            //nothing saved, but still not an error
                            deferred.resolve();
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
             *
             * @method saveMultiple
             *
             * @param {String} storeName
             * @param {Array} datasets
             * @param {Object} options
             * @return {Promise}
             */
            saveMultiple: function (storeName, datasets, options) {
                var promises = [];
                datasets.forEach(function (dataset) {
                    promises.push(_self.save(storeName, dataset, options));
                });

                return Q.all(promises);
            },

            /**
             * Remove an existing dataset
             *
             * @method remove
             *
             * @param {String} storeName
             * @param {String} key
             * @return {Promise}
             */
            remove: function (storeName, key) {
                var deferred = Q.defer(),
                    store = getStoreByName(storeName);

                //store found?
                if (!store) {
                    deferred.reject(ERRORS.STORE_NOT_FOUND);
                }
                //remove
                store.remove(key, deferred.resolve, deferred.reject);

                return deferred.promise;
            },

            /**
             * Update an existing dataset
             *
             * @method update
             *
             * @param storeName
             * @param data
             * @param options
             * @returns {Promise}
             */
            update: function (storeName, data, options) {
                var store = getStoreByName(storeName),
                    deferred = Q.defer();

                options = options || {};

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
                else if (!options.uuidIsHash && !uuid.isValid(data.uuid)) {
                    deferred.reject(ERRORS.UUID_INVALID);
                    return deferred.promise;
                }


                //get data from store
                this.read(storeName, data.uuid, options)
                    //merge
                    .then(function (existingData) {
                        data = _.extend(existingData, data);
                        store.put(data);
                    })
                    //save
                    .then(function () {
                        _self.save(storeName, data, options)
                    })
                    .done(function () {
                        deferred.resolve(data);
                    });


                return deferred.promise;
            }

        }
    }
);