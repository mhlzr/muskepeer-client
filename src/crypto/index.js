/**
 * @class Crypto
 * @module Crypto
 * @see  http://kjur.github.io/jsrsasign/sample-ecdsa.html
 */

define(['sjcl', 'jsrsasign', 'settings', 'project'], function (sjcl, jsrsasign, settings, project) {

    var SIGN_ALGORITHM = 'SHA256withECDSA',
        CURVE_NAME = 'secp256r1';

    return {

        /**
         * Generate a hash from an Object using SHA256
         *
         * @method hash
         * @param data
         * @return {String}
         */

        hash: function (data) {
            var bitArray = sjcl.hash.sha256.hash(JSON.stringify(data));
            return sjcl.codec.hex.fromBits(bitArray);
        },

        /**
         * @method isValidPublicKey
         * @param key
         * @return {Boolean}
         */
        isValidPublicKey: function (key) {
            return new RegExp(/^[a-zA-Z0-9_]{130}$/gi).test(key);
        },

        /**
         * @method isValidPrivateKey
         * @param key
         * @return {Boolean}
         */
        isValidPrivateKey: function (key) {
            return new RegExp(/^[a-zA-Z0-9_]{64}$/gi).test(key);
        },

        /**
         * Sign a message using Elliptic Curve DSA
         *
         * @method sign
         * @param message
         * @return {String} signature
         */
        sign: function (message) {

            if (!settings.privateKey) {
                var key = window.prompt('Enter your privateKey as HEX');

                if (this.isValidPrivateKey(key)) {
                    settings.privateKey = key;
                }
                else {
                    window.alert('Invalid private key!');
                    return null;
                }
            }


            var sig = new KJUR.crypto.Signature({"alg": SIGN_ALGORITHM, "prov": "cryptojs/jsrsa"});
            sig.initSign({'ecprvhex': settings.privateKey, 'eccurvename': CURVE_NAME});
            sig.updateString(message);

            return sig.sign();


        },

        /**
         * Verify that a message and signature haven't been manipulated
         *
         * @method verify
         * @param message
         * @param signature
         * @return {Boolean}
         */
        verify: function (message, signature) {

            if (!project.publicKey) {
                throw new Error('No publicKey defined for project');
            }
            else if (!this.isValidPublicKey(project.publicKey)) {
                throw new Error('publicKey defined for project is invalid');
            }

            var sig = new KJUR.crypto.Signature({"alg": SIGN_ALGORITHM, "prov": "cryptojs/jsrsa"});
            sig.initVerifyByPublicKey({'ecpubhex': project.publicKey, 'eccurvename': CURVE_NAME});
            sig.updateString(message);

            return sig.verify(signature);
        }

    }

});