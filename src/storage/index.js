/**
 * Storage
 *
 * @module Storage
 * @class Storage
 * @extends MuskepeerModule
 */

define(['q', './database', './filesystem', 'project', 'muskepeer-module'], function (Q, database, fileSystem, project, MuskepeerModule) {


        var module = new MuskepeerModule();

        /**
         * Get all uuids from the documents stored in a specific store
         *
         * @private
         * @method getUuidListFromStore
         *
         * @param storeName
         * @return {Promise}
         */
        function getUuidListFromStore(storeName) {
            var deferred = Q.defer();

            module.db.findAndReduceByObject(storeName, {filterDuplicates: false}, {projectUuid: project.uuid}).then(function (results) {
                deferred.resolve(_.map(results, function (result) {
                    return result.uuid;
                }));
            });

            return deferred.promise;
        }


        /**
         * Get the internalList from storage and compare to a given list of uuids.
         * Only the difference from both lists will be returned.
         * Used for synchronization of two peers.
         *
         * @private
         * @method getDifferenceFromStoreAndExternalList
         *
         * @param storeName
         * @param externalList
         * @return {Promise}
         */
        function getDifferenceFromStoreAndExternalList(storeName, externalList) {
            var deferred = Q.defer();

            getUuidListFromStore(storeName)
                .then(function (internalList) {
                    deferred.resolve(_.difference(externalList, internalList))
                });

            return deferred.promise;
        }

        return module.extend({

            /**
             * Initialize Storage Module
             *
             * @method init
             * @return {Promise}
             */
            init: function () {
                return database.init()
                    .then(function () {
                        logger.log('Database', 'ready');
                        return fileSystem.init(database);
                    })
                    .then(function () {

                        logger.log('FileSystem', 'ready');
                        module.db = database;
                        module.fs = fileSystem;
                        module.isReady = true;
                    });
            },

            /**
             * @property isReady
             * @type {Boolean}
             */
            isReady: false,
            db: null,
            fs: null,


            /**
             * Get a list of all files (their uuids) from storage
             *
             * @method getFileUuidsAsArray
             * @return {Promise}
             */
            getFileUuidsAsArray: function () {
                return getUuidListFromStore('files');
            },

            /**
             * Get a list of all jobs (their uuids) from storage
             *
             * @method getJobUuidsAsArray
             * @return {Promise}
             */
            getJobUuidsAsArray: function () {
                return getUuidListFromStore('jobs');
            },

            /**
             * Get a list of all results (their uuids) from storage
             *
             * @method getResultUuidsAsArray
             * @return {Promise}
             */
            getResultUuidsAsArray: function () {
                return getUuidListFromStore('results');
            },


            /**
             * Compare internalList and externalList of files
             *
             * @method getMissingFileUuidsAsArray
             * @param externalList
             * @returns {Promise}
             */
            getMissingFileUuidsAsArray: function (externalList) {
                return getDifferenceFromStoreAndExternalList('files', externalList);
            },


            /**
             * Compare internalList and externalList of jobs
             *
             * @method getMissingJobUuidsAsArray
             * @param externalList
             * @returns {Promise}
             */
            getMissingJobUuidsAsArray: function (externalList) {
                return getDifferenceFromStoreAndExternalList('jobs', externalList);
            },


            /**
             * Compare internalList and externalList of results
             *
             * @method getMissingResultUuidsAsArray
             * @param externalList
             * @returns {Promise}
             */
            getMissingResultUuidsAsArray: function (externalList) {
                return getDifferenceFromStoreAndExternalList('results', externalList);
            }
        });

    }
);