/**
 * Storage
 *
 * @class Storage
 * @module Storage
 *
 */

define(['./database', './filesystem', 'muskepeer-module'], function (database, fileSystem, MuskepeerModule) {


        var module = new MuskepeerModule();


        return module.extend({

            init: function () {
                return database.init()
                    .then(function () {
                        fileSystem.init(database);
                    })
                    .then(function () {
                        module.db = database;
                        module.files = fileSystem;
                        module.isReady = true;
                    });
            },
            isReady: false,
            db: null,
            files: null
        });

    }
);