/**
 * @module Crypto
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['sjcl'], function (sjcl) {

    return {
        hash: function (data) {
            var bitArray = sjcl.hash.sha256.hash(data);
            return sjcl.codec.hex.fromBits(bitArray);
        }

    };
});