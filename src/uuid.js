/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['node-uuid'], function (uuid) {

    var format = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

    return {
        /**
         * Generates an universally unique identifier
         * @returns {String}
         */
        generate: function () {
            return  uuid.v4();
        },
        /**
         * Test if a uuid is valid
         * @param uuid
         * @returns {boolean}
         */
        isValid: function (uuid) {
            return format.test(uuid);
        }
    };
});