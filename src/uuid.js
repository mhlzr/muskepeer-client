/**
 * @author Matthieu Holzer
 * @date 17.10.13
 */

define(['node-uuid'], function (uuid) {
    return {
        generate: function () {
            return  uuid.v4();
        }
    };
});