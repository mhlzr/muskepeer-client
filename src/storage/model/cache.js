/**
 *
 *
 * @module Cache
 * @class Cache
 */

define(['lodash', 'q', '../database', 'mixing'], function (_, Q, database, mixing) {


    return function Cache(storeName, comparisonFunction) {


        comparisonFunction = comparisonFunction || _.isEqual;

        var initialSync = false,
            datasets = {};


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

            return database.list(storeName)
                .progress(function (dataset) {
                    datasets[dataset.uuid] = dataset;
                }).then(function () {
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
                hasChanged = !comparisonFunction.apply(this, [this.get(hash), dataset]);

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
                    database.update(storeName, dataset, {uuidIsHash: true});
                }

            }
            // Insert
            else {
                datasets[hash] = dataset;
                // Database Insert
                database.save(storeName, dataset, {uuidIsHash: true});
                hasChanged = true;
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
            if (!filter) return datasets;

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

    };
});