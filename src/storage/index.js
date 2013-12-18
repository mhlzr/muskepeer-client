/**
 * Storage
 *
 * @module Storage
 * @class Storage
 * @extends MuskepeerModule
 */

define(['./database', './filesystem', 'muskepeer-module'], function (database, fileSystem, MuskepeerModule) {


        var module = new MuskepeerModule();


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
            fs: null
        });

    }
);