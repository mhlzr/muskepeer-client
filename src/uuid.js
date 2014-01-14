/**
 * Module to generate and test UUIDs
 *
 * @module Uuid
 * @class Uuid
 */

define(['node-uuid'], function (uuid) {

    var format = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

    return {
        /**
         * Generates an universally unique identifier
         *
         * @method generate
         * @return {String} An Universally unique identifier v4
         * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
         */
        generate: function () {
            return  uuid.v4();
        },

        /**
         * Test if a uuid is valid
         *
         * @method isValid
         * @param uuid
         * @returns {boolean}
         */
        isValid: function (uuid) {
            return format.test(uuid);
        }
    };
});