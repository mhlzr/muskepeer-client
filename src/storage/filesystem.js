/**
 * FileSystem
 *
 * @module Storage
 * @submodule FileSystem
 *
 * @see http://www.html5rocks.com/de/tutorials/file/filesystem/
 * @see https://gist.github.com/robnyman/1894032
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL
 * @see http://www.html5rocks.com/en/tutorials/file/filesystem/#toc-filesystemurls
 */

define(['lodash', 'crypto/index', 'q', 'project', 'settings'], function (_, crypto, Q, project, settings) {

    var CHUNK_SIZE = 1000;

    var _self,
        _db,
        _fs;

    function requestFileSystem() {
        var deferred = Q.defer();

        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        window.requestFileSystem(window.PERSISTENT, settings.fileStorageSize, deferred.resolve, function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    function requestQuota() {
        var deferred = Q.defer();
        navigator.webkitPersistentStorage = navigator.webkitPersistentStorage || window.webkitStorageInfo;

        navigator.webkitPersistentStorage.requestQuota(settings.fileStorageSize, deferred.resolve, deferred.reject);
        return deferred.promise;
    }

    function getFileNameFromUri(uri) {
        var regex = new RegExp(/[^\\/]+$/);
        return uri.match(regex)[0];
    }

    function createSubDirectory(dir) {
        var deferred = Q.defer();

        _fs.root.getDirectory(dir, {create: true}, deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    /**
     * Gets a file via XHR and returns a promise containing a Blob
     *
     * @private
     * @method download
     *
     * @param file
     * @return {Promise}
     *
     */
    function downloadViaXHR(file) {
        var deferred = Q.defer(),
            xhr = new XMLHttpRequest(),
            blob;

        xhr.open('GET', file.uri, true);
        xhr.responseType = 'blob';

        xhr.addEventListener('progress', function (e) {
            deferred.notify(e);
        });

        xhr.addEventListener('load', function (e) {

            if (xhr.status === 200) {
                blob = xhr.response;
                deferred.resolve(blob);
            }
            else {
                deferred.reject('Error downloading file');
            }

        }, false);

        xhr.send();

        return deferred.promise;
    }


    return {


        /**
         * Initialize fileStorage
         *
         * @chainable
         * @method init
         *
         * @param db instance of database
         * @return {Object}
         */
        init: function (db) {

            _self = this;
            _db = db;

            return requestQuota()
                .then(requestFileSystem)
                .then(function (fileSystem) {
                    _fs = fileSystem;
                    return createSubDirectory(project.uuid);
                });
        },

        /**
         * @method write
         * @param path
         * @param blob
         * @returns {promise|*}
         */
        write: function (path, blob, pos) {
            var deferred = Q.defer();

            //TODO if file already exists, we will append, not overwrite

            //Does the file exist in database?
            //Is it marked as complete?)

            _fs.root.getFile(project.uuid + '/' + path, {create: true }, function (fileEntry) {

                fileEntry.createWriter(function (writer) {

                    // Start at given position or EOF
                    pos = pos || writer.length;
                    writer.seek(pos);
                    writer.write(blob);

                    deferred.resolve();

                }, deferred.reject);

            }, deferred.reject);

            return deferred.promise;
        },

        /**
         * @method read
         * @param path
         */
        readFileAsLocalUrl: function (path) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + path, {}, function (fileEntry) {
                deferred.resolve(fileEntry.toURL());
            }, deferred.reject);

            return deferred.promise;
        },

        readFileAsDataUrl: function (path, offset) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + path, {}, function (fileEntry) {

                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function (file) {

                    var reader = new FileReader(),
                        start = offset || 0,
                        end = start + CHUNK_SIZE,
                        blob, chunk;

                    //
                    if (start + CHUNK_SIZE > file.size) {
                        end = file.size;
                    }

                    blob = file.slice(start, end);

                    reader.onloadend = function (e) {

                        if (e.target.readyState === FileReader.DONE) {

                            // Remove data attribute prefix
                           // chunk = reader.result.match(/,(.*)$/);

                            deferred.resolve(reader.result);

                           // if (chunk) {
                           //     deferred.resolve(chunk[1]);
                           //     reader = null;
                           // } else {
                            //    deferred.reject();
                           // }

                        } else {
                            deferred.rejct();
                        }

                    };

                    reader.readAsDataURL(blob);

                }, deferred.reject);


            }, deferred.reject);

            return deferred.promise;
        },

        /**
         * Retrieve a file from storage by url,
         *
         * @method getFileByUri
         *
         * @param uri
         */
        getFileByUri: function (uri) {

        },


        /**
         * Add a file to storage
         * @method add
         *
         * @return {Promise}
         */
        add: function (uris) {

            var promises = [];

            //just a single uri?
            if (!_.isArray(uris)) {
                uris = [uris];
            }

            uris.forEach(function (uri) {

                var file = {
                    name: getFileNameFromUri(uri),
                    uri: uri,
                    size: 0,
                    position: 0,
                    isComplete: false,
                    uuid: crypto.hash(uri)
                };

                var promise = _db.read('files', file.uuid, {uuidIsHash: true})
                    .then(function (result) {
                        if (!result) {
                            return _db.save('files', file, {allowDuplicates: false, uuidIsHash: true});
                        }

                    });

                promises.push(promise);

            });

            return Q.all(promises);
        },

        /**
         *
         * @return {Promise}
         */
        getListOfIncompleteFiles: function () {
            return _db.findAndReduceByObject('files', {filterDuplicates: false}, {projectUuid: project.uuid, isComplete: false});
        },

        download: function () {

            // Get incomplete files from database
            return this.getListOfIncompleteFiles()
                .then(function (files) {

                    var promises = [];

                    files.forEach(function (file) {

                        var promise = downloadViaXHR(file)
                            .progress(function (e) {
                                if (e.lengthComputable) {
                                    _db.update('files', {uuid: file.uuid, position: e.position, size: e.totalSize}, {uuidIsHash: true});
                                }
                            })
                            .catch(function (e) {
                                logger.error('FileStorage', file.uri, 'error during download!');
                            })
                            .done(function (blob) {

                                logger.log('FileStorage', file.uri, 'download complete!');

                                _db.update('files', {uuid: file.uuid, isComplete: true, position: blob.size, size: blob.size}, {uuidIsHash: true});

                                return _self.write(file.name, blob);
                            });

                        promises.push(promise);


                    });

                    return Q.all(promises);

                });


        },

        /**
         * Retrieve a file from storage by uuid (hash)
         *
         * @method getFileByUuid
         *
         * @param uuid
         */
        getFileByUuid: function (uuid) {
            return _storage.read('files', uuid, {uuidIsHash: true});
        },

        /**
         * @method hasLocalFile
         *
         * @param uuid
         * @return {Boolean}
         */
        hasLocalFile: function (uuid) {

        }


    };
})
;