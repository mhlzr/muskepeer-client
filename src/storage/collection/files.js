/**
 * Files
 *
 * @module Storage
 * @submodule Files
 * @class Files
 */

define(['crypto/index'], function (crypto) {

    var _storage;

    return {

        /**
         * @chainable
         * @method init
         * @param storage
         * @return {Object}
         */
        init: function (storage) {
            _storage = storage;
            return this;
        },


        /**
         * @method add
         * @param {Blob} blob
         * @param {String} [name]
         * @return {Promise}
         */
        add: function (blob, name) {

            var file = {
                uuid: crypto.hash(blob),
                name: name || '',
                data: blob
            };

            return _storage.save('files', file, {allowDuplicates: false, uuidIsHash: true});
        },

        /**
         * @method getFileByUuid
         * @param uuid
         */
        getFileByUuid: function (uuid) {
        },

        /**
         * @method hasLocalFile
         * @param uuid
         * @returns {boolean}
         */
        hasLocalFile: function (uuid) {
            return false;
        }
    };
});