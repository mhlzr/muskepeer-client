/**
 * FileSystem
 *
 * @module FileSystem
 * @class FileSystem
 *
 * @see http://www.html5rocks.com/de/tutorials/file/filesystem/
 * @see https://gist.github.com/robnyman/1894032
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL
 * @see http://www.html5rocks.com/en/tutorials/file/filesystem/#toc-filesystemurls
 *
 */

define(['lodash', 'crypto/index', 'q', 'project', 'settings'], function (_, crypto, Q, project, settings) {

    /**
     * @final
     * @property CHUNK_SIZE
     * @type {Number}
     */
    var CHUNK_SIZE = 1024;

    var _self,
        _db,
        _fs;

    /**
     * Request access to the local fileSystem,
     * will cause a user prompt at first attempt
     *
     * @private
     * @method requestFileSystem
     * @return {Promise}
     */
    function requestFileSystem() {
        var deferred = Q.defer();

        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        window.requestFileSystem(window.PERSISTENT, settings.fileStorageSize, deferred.resolve, function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /**
     * Request a specific stoage-quota
     * will cause a user prompt at first attempt
     *
     * @private
     * @method requestQuota
     * @return {Promise}
     */
    function requestQuota() {
        var deferred = Q.defer();

        navigator.webkitPersistentStorage = navigator.webkitPersistentStorage || window.webkitStorageInfo;
        navigator.webkitPersistentStorage.requestQuota(settings.fileStorageSize || 50 * 1024 * 1024, deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    /**
     * Parse a fileName from an uri
     *
     * @private
     * @method getFileNameFromUri
     * @param {String} uri
     * @return {String}
     */
    function getFileNameFromUri(uri) {
        var regex = new RegExp(/[^\\/]+$/);
        return uri.match(regex)[0];
    }

    /**
     * Create a directory in filesystem
     *
     * @private
     * @method createSubDirectory
     * @param {String} dir
     * @return {Promise}
     */
    function createSubDirectory(dir) {
        var deferred = Q.defer();

        _fs.root.getDirectory(dir, {create: true}, deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    /**
     * Gets a file via XHR and returns a promise,
     * resolve will contain a Blob
     *
     * @private
     * @method download
     *
     * @param {Object} file
     * @return {Promise}
     *
     */
    function downloadViaXHR(file) {
        var deferred = Q.defer(),
            xhr = new XMLHttpRequest(),
            data;

        xhr.open('GET', file.uri, true);
        xhr.responseType = 'blob';

        xhr.addEventListener('progress', function (e) {

            // Maybe somehow there will already be some chunks in here
            if (e.target.response instanceof Blob) {
                data = {
                    blob: e.target.response,
                    position: e.position,
                    totalSize: e.totalSize
                };
            }
            else {
                // If not at least we can store these info
                data = {totalSize: e.totalSize}
            }

            deferred.notify(data);
        });

        xhr.addEventListener('load', function (e) {

            if (xhr.status === 200) {
                data = {
                    blob: e.target.response,
                    position: e.position,
                    totalSize: e.target.response.size
                };
                deferred.resolve(data);
            } else {
                deferred.reject('Error downloading file');
            }

        }, false);

        xhr.send();

        return deferred.promise;
    }


    /**
     * Updates the list by getting the newest info from db
     *
     * @private
     * @method updateFileList
     * @return {Promise}
     */
    function updateFileList() {
        return _self.getFileList()
            .then(function (files) {
                _self.list = files;
            });
    }


    return {

        /**
         * List of related files in db,
         * will always be updated automatically
         *
         * @property list
         * @type {Array}
         */
        list: null,

        /**
         * Initialize fileStorage
         *
         * @chainable
         * @method init
         *
         * @param db Instance of database submodule
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
                })
                .then(function () {
                    return updateFileList();
                });
        },

        /**
         * Write a file/blob to the local filesystem
         *
         * @method write
         *
         * @param {Object} file
         * @param {Blob} blob
         * @param {Number} [pos]
         *
         * @return {Promise}
         */
        write: function (file, blob, pos) {
            var deferred = Q.defer(),
                writtenBytes = 0,
                isNewFile = true;

            // Does the file exist in database?
            _db.read('files', file.uuid, {uuidIsHash: true})
                .then(function (fileInfo) {
                    // Just to make sure, we have data that is up to date
                    file = fileInfo;
                    //Is it marked as complete?)
                    if (!file || file.isComplete) {
                        deferred.reject('File does not exist, or is already complete');
                    }

                    writtenBytes = file.position;
                    isNewFile = writtenBytes === 0;

                    // We won't overwrite fileDate
                    if (pos < writtenBytes) {
                        deferred.reject('Position is lower than already written bytes!');
                    }
                })
                .then(function () {
                    // Append bytes
                    _fs.root.getFile(project.uuid + '/' + file.uuid, {create: isNewFile }, function (fileEntry) {

                        fileEntry.createWriter(function (writer) {

                            // Start at given position or EOF
                            pos = pos || writer.length;
                            writer.seek(pos);
                            writer.write(blob);


                        }, deferred.reject);

                    }, deferred.reject);
                })
                .then(function () {
                    // Update fileInfo in database
                    var currentPosition = file.position + blob.size;
                    return _db.update('files', {uuid: file.uuid, isComplete: currentPosition >= file.size, position: currentPosition}, {uuidIsHash: true});
                })
                .then(updateFileList);


            return deferred.promise;
        },

        /**
         * Get a local url to a file in fileSystem
         *
         * @method readFileAsLocalUrl
         * @param {Object} file
         * @return {Promise}
         */
        readFileAsLocalUrl: function (file) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + file.uuid, {}, function (fileEntry) {
                deferred.resolve(fileEntry.toURL());
            }, deferred.reject);

            return deferred.promise;
        },

        /**
         * Read some chunks from the file,
         * chunk sie is defined globally by CHUNK_SIZE.
         *
         * @param {Object} file
         * @param {Number} offset
         * @return {Promise}
         */
        readFileChunkAsDataUrl: function (file, offset) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + file.uuid, {}, function (fileEntry) {

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
         * Add filese-entries to the storage database,
         * not to the filesystem.
         *
         * @method add
         * @param {Array|String} uris
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

            return Q.all(promises).then(updateFileList);
        },

        /**
         * Get an array of incomplete files from storage-database
         *
         * @method getListOfIncompleteFiles
         * @return {Promise}
         */
        getIncompleteFileList: function () {
            return _db.findAndReduceByObject('files', {filterDuplicates: false}, {projectUuid: project.uuid, isComplete: false});
        },

        /**
         * Get an array of all files from storage-database
         *
         * @method getFileList
         * @return {Promise}
         */
        getFileList: function () {
            return _db.findAndReduceByObject('files', {filterDuplicates: false}, {projectUuid: project.uuid});
        },


        /**
         * This will download all incomplete files from their urls.
         * Should be used if you know, that there are no other peers in you pool,
         * that can deliver the files you need.
         *
         * @method downloadIncompleteFiles
         * @return [Promise}
         */
        downloadIncompleteFiles: function () {

            // Get incomplete files from database
            return this.getIncompleteFileList()
                .then(function (files) {

                    var promises = [];

                    files.forEach(function (file) {

                        var promise = downloadViaXHR(file)
                            .progress(function (data) {

                                // We gort some chunks
                                if (data.blob && data.position) {
                                    _db.update('files', {uuid: file.uuid, size: data.totalSize, position: data.position}, {uuidIsHash: true})
                                        .then(function () {
                                            _self.write(file, data.blob, data.position);
                                        });
                                }

                                // We only got some info
                                else {
                                    _db.update('files', {uuid: file.uuid, size: data.totalSize}, {uuidIsHash: true})
                                }

                            })
                            .catch(function (err) {
                                logger.error('FileStorage', file.uri, 'error during download!');
                            })
                            .done(function (data) {

                                logger.log('FileStorage', file.uri, 'download complete!');

                                _db.update('files', {uuid: file.uuid, isComplete: true, position: data.blob.size, size: data.blob.size}, {uuidIsHash: true});

                                return _self.write(file, data.blob).then(updateFileList);
                            });

                        promises.push(promise);


                    });

                    return Q.all(promises);

                });


        },

        /**
         * Retrieve a filInfo object from storage (db) by uuid (hash).
         *
         * @method getFileInfoByUuid
         *
         * @param uuid
         * @return {Object}
         */
        getFileInfoByUuid: function (uuid) {
            return _db.read('files', uuid, {uuidIsHash: true});
        },


        /**
         * Retrieve a fileInfo object from storage by url.
         *
         * @method getFileInfoByUri
         *
         * @param uri
         * @return {Array} can be multiple files
         */
        getFileInfoByUri: function (uri) {
            return _db.findAndReduceByObject('files', {}, {uri: uri});
        },


        /**
         * Will delete all files/folders inside the project-dir recursively
         * as well as the references (fileInfo) in database
         *
         * @method clear
         * @return {Promise}
         */
        clear: function () {
            var deferred = Q.defer();

            // Delete form filesystem
            _fs.root.getDirectory(project.uuid, {}, function (dirEntry) {

                dirEntry.removeRecursively(function () {

                    deferred.resolve();
                }, deferred.reject);

            }, deferred.reject);


            return deferred.promise
                .then(_self.getFileList)
                .then(function (files) {
                    var promises = [];

                    //Delete from database
                    files.forEach(function (file) {
                        promises.push(_db.remove('files', file.uuid, {uuidIsHash: true}));
                    });

                    return Q.all(promises);
                }).then(function () {
                    logger.log('FileStorage', 'removed all files/folders from file-system!');
                    return updateFileList();
                });
        }


    };
})
;