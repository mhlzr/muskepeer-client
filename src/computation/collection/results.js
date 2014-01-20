/**
 * @class Results
 * @module Results
 */


define(['q', 'storage/index', 'project'], function (Q, storage, project) {

        var module = {},
            cacheIsInSync = false;

        /**
         * @private
         * @method getResultsFromStorage
         * @param {Boolean} filterValidated
         * @return {Promise}
         */
        function getResultsFromStorage(filterValidated) {

            filterValidated = filterValidated || false;

            var filter = {
                projectUuid: project.uuid
            };

            if (filterValidated && project.computation.results.validation.enabled) {
                filter.isValid = true;
            }

            return storage.db.findAndReduceByObject('results', {filterDuplicates: false}, filter);
        }


        /**
         * @property size
         * @type {Number}
         */
        module.size = 0;

        /**
         * @property cache
         * @type {Array}
         */
        module.cache = [];


        /**
         * Read all results from storage and save hashs to cache
         *
         * @method fillCache
         * @return {Promise}
         */
        module.fillCache = function () {
            var deferred = Q.defer();

            if (cacheIsInSync) {
                deferred.resolve(true);
            }
            else {
                getResultsFromStorage().then(function (results) {

                    results.forEach(function (result) {
                        module.cache.push(result.uuid);
                    });

                    module.size = results.length;
                    cacheIsInSync = true;
                })
            }
            return deferred.promise;
        };

        /**
         * Adds a result to the storage. If its new will return true,
         * if it's an update it will return false;
         *
         * @method add
         * @param {Result} result
         * @return {Promise}
         */
        module.add = function (result) {

            // We need some buffer db i/o
            // is quite slow
            if (module.cache.indexOf(result.uuid) >= 0) {
                var deferred = Q.defer();
                deferred.resolve(false);
                return deferred.promise;
            }


            else {

                module.cache.push(result.uuid);

                if (module.cache.length > project.computation.results.cacheSize) {
                    module.cache = [];
                }

                // Already existent?
                return storage.db.has('results', result.uuid, {uuidIsHash: true})
                    .then(function (exists) {
                        if (!exists) {
                            // Is new

                            return storage.db.save('results', result, {uuidIsHash: true})
                                .then(function () {
                                    return true;
                                });
                        }
                        // Is an update
                        else {
                            return module.update(result);
                        }
                    })
            }
        };

        /**
         * Update a result, will return true, if the result really changed.
         *
         * @method update
         * @param result
         * @return {Boolean}
         */
        module.update = function (result) {

            var deferred = Q.defer();


            // Without enabled validation, there updating a result is not allowed
            // If it's already valid, there is no need, for the whole process
            if (!project.computation.results.validation.enabled || result.isValid) {
                deferred.resolve(false);

            }

            // Read stored result
            storage.db.read('results', result.uuid, {uuidIsHash: true})

                .then(function (resultFromStorage) {

                    // No need to update
                    if (resultFromStorage.isValid || resultFromStorage.iteration >= project.computation.results.validation.iterations) {
                        deferred.resolve(false);
                    }

                    // Increase iterations, then Update,
                    result.iteration = resultFromStorage.iteration + 1;

                    // Already did enough iterations, result is now valid
                    if (result.iteration >= project.computation.results.validation.iterations) {
                        result.isValid = true;
                    }

                    // Update result
                    return storage.db.update('results', result, {uuidIsHash: true});


                }).then(function () {
                    // We made changes!
                    deferred.resolve(true);
                });

            return deferred.promise;

        };

        /**
         * @method clear
         * @return {Promise}
         */
        module.clear = function () {
            return storage.db.clear(['results']);
        };


        /**
         * @method getResultByUuid
         * @param {String} uuid
         * @return {Promise}
         */
        module.getResultByUuid = function (uuid) {
            return storage.db.read('results', uuid, {uuidIsHash: true});
        };


        /**
         * @method isValid
         * @param result
         * @return {Promise}
         */
        module.isValid = function (result) {
            return storage.db.read('results', result.uuid, {uuidIsHash: true})
                .then(function (resultFromStorage) {
                    return resultFromStorage && resultFromStorage.isValid === true;
                });
        };


        /**
         * @method allValid
         * @return {Promise}
         */
        module.allValid = function () {
            return getResultsFromStorage(true)
                .then(function (results) {
                    return results.length === project.computation.results.expected;
                });

        };


        return module;

    }
)
;
