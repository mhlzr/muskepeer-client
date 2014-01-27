/**
 * Uses an object to cache datasets from storage.
 * As Object.hasownProperty seems to be faster than Array.indexOf
 * http://jsperf.com/array-hasownproperty-vs-array-indexof
 *
 * @module Cache
 * @class Cache
 *
 */

define(['lodash', 'q', '../database', 'mixing', 'project'], function (_, Q, database, mixing, project) {


    return function Cache(storeName, autoSaveIntervalTime, comparisonFunction) {

        autoSaveIntervalTime = autoSaveIntervalTime || 60000;
        comparisonFunction = comparisonFunction || _.isEqual;

        var initialSync = false,
            hasUnsynchedChanges = false,
            datasets = {},
            autoSaveInterval;


        /**
         * Indicates if cache and store are in sync
         *
         * @property isSync
         * @type {boolean}
         */
        this.isSync = initialSync;


        /**
         * Read data from storage and store in cache
         *
         * @method syncWithStorage
         */
        this.syncWithStorage = function () {

            logger.log('Cache', 'Syncing', storeName);

            return database.list(storeName)
                .progress(function (dataset) {
                    datasets[dataset.uuid] = dataset;
                }).then(function (all) {
                    initialSync = true;
                });
        };


        /**
         * Test if a hash is in cache
         *
         * @method has
         * @param hash
         * @return Boolean
         */
        this.has = function (hash) {
            return datasets.hasOwnProperty(hash);
        };

        /**
         * Get data
         *
         * @method has
         * @param dataset
         */
        this.get = function (dataset) {

            if (!dataset.uuid) return null;

            if (this.has(dataset.uuid)) {
                return datasets[dataset.uuid];
            } else {
                return null;
            }


        };


        /**
         * Insert or update data
         *
         * @param dataset
         */
        this.set = function (dataset) {

            if (!dataset.uuid) {
                return false;
            }

            var hash = dataset.uuid,
                hasChanged = false;

            // Update needed?
            if (this.has(hash)) {

                // Detect if it is a real update
                hasChanged = !comparisonFunction.apply(this, [this.get(dataset), dataset]);

                // Update
                if (hasChanged) {

                    //Merge
                    dataset = mixing(datasets[hash], dataset, {
                        overwrite: true,
                        recursive: true
                    });

                    // Update cache
                    datasets[hash] = dataset;

                    // Database Update
                    //database.update(storeName, dataset, {uuidIsHash: true});
                    hasUnsynchedChanges = true;
                }

            }
            // Insert
            else {
                datasets[hash] = dataset;
                // Database Insert
                //database.save(storeName, dataset, {uuidIsHash: true});

                hasChanged = true;
                hasUnsynchedChanges = true;
            }

            return hasChanged;

        };


        /**
         * Reduce data by a given filter function
         *
         * @method filter
         * @param {Function} filter
         */
        this.filter = function (filter) {

            // No filter applied
            if (!filter) return _.toArray(datasets);

            return _.filter(datasets, filter);
        };


        /**
         * Clears cache
         *
         * @method flush
         */
        this.flush = function () {
            datasets = {};
        };


        /**
         * @method size
         * @returns {Number}
         */
        this.size = function () {
            return _.size(datasets);
        };


        /**
         * @method save
         */
        this.save = function () {
            var deferred = Q.defer();

            if (!hasUnsynchedChanges) {
                deferred.resolve();
            }

            var sets = _.toArray(datasets);

            sets.forEach(function (dataset) {
                dataset.projectUuid = project.uuid;
            });

            logger.log('Cache', 'Saving', this.size(), storeName, 'to storage');

            database.overwrite(storeName, sets).then(function () {
                hasUnsynchedChanges = false;
                deferred.resolve();
            });

            return deferred.promise;


        }.bind(this);

        /*
         * @method enableAutoSave
         */
        this.enableAutoSave = function () {
            autoSaveInterval = setInterval(this.save, autoSaveIntervalTime);
        };

        /**
         * @method disableAutoSave
         */
        this.disableAutoSave = function () {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        };

    };
});