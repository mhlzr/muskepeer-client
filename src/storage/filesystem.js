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
    var CHUNK_SIZE = 512;

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
     *
     * @param fileInfo
     * @param mode
     * @param offset
     * @param completeFile
     * @returns {Promise}
     */
    function readFile(fileInfo, mode, offset, completeFile) {

        var deferred = Q.defer();

        mode = mode || 'blob';
        completeFile = completeFile || false;

        _fs.root.getFile(project.uuid + '/' + fileInfo.uuid, {}, function (fileEntry) {

            fileEntry.file(function (file) {

                var start = offset || 0,
                    end = start + CHUNK_SIZE,
                    blob;

                // Every file has an end
                if (start + CHUNK_SIZE > file.size) {
                    end = file.size;
                }

                // Slice that file
                if (!completeFile) {
                    blob = file.slice(start, end);
                } else {
                    blob = file;
                }

                // Blob Mode, no need for FileReader
                if (mode === 'blob') {
                    deferred.resolve(blob);
                }

                // Using FileReader
                else {
                    var reader = new FileReader();

                    reader.onloadend = function (e) {

                        if (e.target.readyState === FileReader.DONE) {

                            if (mode === 'dataUrl') {
                                // Remove data attribute prefix
                                var chunk = reader.result.match(/,(.*)$/);
                                if (chunk) {
                                    deferred.resolve(chunk[1]);
                                } else {
                                    deferred.reject();
                                }
                            } else {
                                deferred.resolve(reader.result);
                            }
                            reader = null;

                        } else {
                            deferred.reject();
                        }

                    };

                    // DataUrl Mode
                    if (mode === 'dataUrl') {
                        reader.readAsDataURL(blob);
                        // ArrayBuffer Mode
                    } else if (mode === 'arrayBuffer') {
                        reader.readAsArrayBuffer(blob);
                    }

                }


            }, deferred.reject);


        }, deferred.reject);

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


    /**
     * Converts a base64 String to a Blob
     *
     * @private
     * @method base64toBlob
     * @see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
     *
     * @param {String} base64
     * @param {String} [contentType]
     *
     * @return {Blob}
     */
    function base64toBlob(base64, contentType) {
        contentType = contentType || '';

        var byteCharacters = atob(base64);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += CHUNK_SIZE) {
            var slice = byteCharacters.slice(offset, offset + CHUNK_SIZE);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, {type: contentType});

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
                    if (!project.uuid) {
                        logger.error('Filesystem', 'No project uuid set, can not create dir!');
                        throw Error('Filesystem', 'No project uuid set');
                    }
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
         * @param {Object} fileInfo
         * @param {Blob|String} blob or base64-String
         * @param {Number} [pos]
         *
         * @return {Promise}
         */
        write: function (fileInfo, blob, pos) {

            pos = pos || 0;

            var deferred = Q.defer(),
                writtenBytes = 0,
                isNewFile = pos === 0;

            // Test if we need to convert from base64
            if (!blob instanceof Blob) {
                blob = base64toBlob(blob);
            }

            // Does the file exist in database?
            _db.read('files', fileInfo.uuid, {uuidIsHash: true})
                .then(function (info) {
                    // Just to make sure, we have data that is up to date
                    fileInfo = info;
                    //Is it marked as complete?)
                    if (!fileInfo || fileInfo.isComplete) {
                        deferred.reject('File does not exist, or is already complete');
                    }

                    writtenBytes = fileInfo.position;
                    isNewFile = writtenBytes === 0;

                    // We won't overwrite fileDate
                    if (pos < writtenBytes) {
                        deferred.reject('Position is lower than already written bytes!');
                    }
                })
                .then(function () {
                    // Append bytes
                    _fs.root.getFile(project.uuid + '/' + fileInfo.uuid, {create: isNewFile }, function (fileEntry) {

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
                    var currentPosition = fileInfo.position + blob.size;
                    return _db.update('files', {uuid: fileInfo.uuid, isComplete: currentPosition >= fileInfo.size, position: currentPosition}, {uuidIsHash: true});
                })
                .then(updateFileList)
                .then(function () {
                    deferred.resolve();
                });


            return deferred.promise;
        },

        /**
         * Get a local url to a file in fileSystem
         *
         * @method readFileAsLocalUrl
         * @param {Object} fileInfo
         * @return {Promise}
         */
        readFileAsLocalUrl: function (fileInfo) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + fileInfo.uuid, {}, function (fileEntry) {
                deferred.resolve(fileEntry.toURL());
            }, deferred.reject);

            return deferred.promise;
        },


        /**
         * Get an ObjectUrl to a file from FileSystem
         *
         * @method readFileAsObjectUrl
         * @param {Object} fileInfo
         * @return {Promise}
         */
        readFileAsObjectUrl: function (fileInfo) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + fileInfo.uuid, {}, function (fileEntry) {

                fileEntry.file(function (file) {
                    deferred.resolve(URL.createObjectURL(file));
                }, deferred.reject);

            }, deferred.reject);

            return deferred.promise;
        },


        /**
         * Read some chunks from the file, which will resul in a Blob-Instance.
         * Chunk size is defined globally by CHUNK_SIZE.
         * Slicing can be disabled using completeFile param.
         *
         * @method readFileChunkAsBlob
         * @param {Object} file
         * @param {Number} offset
         * @param {Boolean} completeFile
         * @return {Promise}
         */
        readFileChunkAsBlob: function (file, offset, completeFile) {
            return readFile(file, 'blob', offset, completeFile);

        },

        /**
         * Read some chunks from the file, which will be base64 encodded.
         * Chunk size is defined globally by CHUNK_SIZE.
         * Slicing can be disabled using completeFile param.
         *
         * @method readFileChunkAsDataUrl
         * @param {Object} file
         * @param {Number} offset
         * @param {Boolean} completeFile
         * @return {Promise}
         */
        readFileChunkAsDataUrl: function (file, offset, completeFile) {
            return readFile(file, 'dataUrl', offset, completeFile);
        },


        /**
         * Read some chunks from the file and return an ArrayBuffer.
         * Chunk size is defined globally by CHUNK_SIZE.
         * Slicing can be disabled using completeFile param.
         *
         * @method readFileChunkAsArrayBuffer
         * @param {Object} file
         * @param {Number} offset
         * @param {Boolean} completeFile
         * @return {Promise}
         */
        readFileChunkAsArrayBuffer: function (file, offset, completeFile) {
            return readFile(file, 'arrayBuffer', offset, completeFile);
        },


        /**
         * Add file-entries to the storage database,
         * not to the filesystem.
         *
         * @method add
         * @param {Array|String} files
         * @return {Promise}
         */
        add: function (files) {

            var promises = [];

            //just a single uri?
            if (!_.isArray(files)) {
                files = [files];
            }

            files.forEach(function (file) {

                var fileInfo = {
                    name: file.name || getFileNameFromUri(file.url),
                    uri: file.url,
                    size: 0,
                    position: 0,
                    type: file.type || 'text/plain',
                    isComplete: false,
                    uuid: crypto.hash(file.url)
                };

                var promise = _db.read('files', fileInfo.uuid, {uuidIsHash: true})
                    .then(function (result) {
                        if (!result) {
                            return _db.save('files', fileInfo, {allowDuplicates: false, uuidIsHash: true});
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
         * Will always return true, even if an error occured
         *
         * @method deleteFile
         * @param fileInfo
         * @return {Promise}
         */
        deleteFile: function (fileInfo) {
            var deferred = Q.defer();

            _fs.root.getFile(project.uuid + '/' + fileInfo.uuid, {create: false }, function (fileEntry) {

                fileEntry.remove(deferred.resolve, deferred.resolve);

            }, deferred.resolve);

            return deferred.promise;
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

                    files.forEach(function (fileInfo) {

                        var deferred = Q.defer();
                        promises.push(deferred.promise);

                        _self.deleteFile(fileInfo)
                            .then(function () {
                                return downloadViaXHR(fileInfo)
                            }
                        )
                            /*.progress(function (data) {

                             // We got some chunks
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

                             })*/
                            .catch(function (err) {
                                logger.error('FileSystem', fileInfo.uri, 'error during download!');
                            })
                            .done(function (data) {
                                _self.write(fileInfo, data.blob, 0)
                                    .then(function () {
                                        return _db.update('files', {uuid: fileInfo.uuid, isComplete: true, position: data.blob.size, size: data.blob.size}, {uuidIsHash: true})
                                    })
                                    .then(function () {
                                        return updateFileList();
                                    })
                                    .then(function () {
                                        logger.log('FileSystem', fileInfo.uri, 'download complete!');
                                        deferred.resolve();
                                    });

                            });

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
         * etrieve a fileInfo object from storage by name.
         *
         * @param name
         * @return {Array}
         */
        getFileInfoByName: function (name) {
            return _db.findAndReduceByObject('files', {}, {name: name});
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