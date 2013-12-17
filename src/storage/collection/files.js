/**
 * Files
 *
 * @module Storage
 * @submodule Files
 * @class Files
 */

define(['lodash', 'crypto/index', 'q'], function (_, crypto, Q) {

    var _self,
        _storage;

    return {

        /**
         * Initialize fileStorage
         *
         * @chainable
         * @method init
         *
         * @param storage instance of stroageModule
         * @return {Object}
         */
        init: function (storage) {
            _storage = storage;
            _self = this;
            return this;
        },


        /**
         * Add a file to storage
         * @method add
         *
         * @param {Blob} blob
         * @param {String} [uri]
         * @return {Promise}
         */
        add: function (blob, uri) {

            var deferred = Q.defer(),
                file;

            function save(dataString) {
                file = {
                    uuid: crypto.hash(dataString),
                    uri: uri || '',
                    type: blob.type,
                    size: blob.size,
                    data: dataString
                };

                _storage.save('files', blob, {allowDuplicates: false, uuidIsHash: true}).then(function () {
                    deferred.resolve();
                });
            }


            // if the blob is no real blob
            if (_.isString(blob)) {
                save(blob);
            }
            else {
                this.convertBlobToBinaryString(blob).then(function (dataString) {
                    save(dataString);
                })
            }


            return deferred.promise;

        },

        /**
         * Converts a Blob into a String using a FileReader
         * @method convertBlobToBinaryString
         *
         * @param {Blob} blob
         * @return {Promise}
         */
        convertBlobToBinaryString: function (blob) {
            var deferred = Q.defer(),
                reader = new FileReader();

            reader.onload = function (e) {
                deferred.resolve(reader.result);
            };

            reader.readAsBinaryString(blob);

            return deferred.promise;
        },

        /**
         * Retrieve a file from storage by uuid (hash)
         *
         * @method getFileByUuid
         *
         * @param uuid
         */
        getFileByUuid: function (uuid) {
            return _storage.read('files', uuid, true);
        },

        /**
         * Retrieve a file from storage by url,
         * not as precise as uuid, because you are not aware about filechanges
         *
         * @method getFileByUri
         *
         * @param uri
         */
        getFileByUri: function (uri) {

        },

        /**
         * @method hasLocalFile
         *
         * @param uuid
         * @return {Boolean}
         */
        hasLocalFile: function (uuid) {

        },

        /**
         * Gets a file via XHR and returns a promise containing a Blob
         *
         * @method downloadFileFromUri
         * @see https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/
         *
         * @param uri
         * @return {Promise}
         *
         */
        downloadFileFromUri: function (uri) {
            var deferred = Q.defer(),
                xhr = new XMLHttpRequest(),
                blob;

            xhr.open('GET', uri, true);
            xhr.responseType = 'blob';

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
        },


        /**
         * Batch method for downloading ans storing files
         * @method downloadAndStoreFiles
         *
         * @param {Array} uris
         * @return {Promise}
         */
        downloadAndStoreFiles: function (uris) {
            var promises = [];

            //Just one file?
            if (!_.isArray(uris)) return this.downloadFileFromUri().then(function (blob) {
                _self.add(blob, uris);
            });

            uris.forEach(function (uri) {
                promises.push(

                    _self.downloadFileFromUri(uri)
                        .then(function (blob) {
                            return _self.add(blob, uri);
                        }));
            });

            return Q.all(promises);

        }
    };
});