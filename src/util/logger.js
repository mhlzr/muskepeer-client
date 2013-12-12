/**
 * @author Matthieu Holzer
 * @date 12.11.13
 * @module Logger
 * @class Logger
 */

define([], function () {

    /**
     * Create a timestamp ( format : HH::MM:SS )
     *
     * @private
     * @method getPrettyTimeStamp
     * @return {String}
     */
    function getPrettyTimeStamp() {
        var current = new Date(),
            date = [],
            hours = current.getHours() < 10 ? ('0' + current.getHours()) : current.getHours(),
            minutes = current.getMinutes() < 10 ? ('0' + current.getMinutes()) : current.getMinutes(),
            seconds = current.getSeconds() < 10 ? ('0' + current.getSeconds()) : current.getSeconds();

        date.push(hours);
        date.push(minutes);
        date.push(seconds);

        return date.join(':');
    }

    return {

        /**
         * Log some information
         *
         * @method log
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        log: function (msg, desc, data) {
            if (desc && !data) {
                console.log(getPrettyTimeStamp(), msg + ':', desc);
            }
            else if (desc && data) {
                console.log(getPrettyTimeStamp(), msg, desc, ':', data);
            }
            else {
                console.log(getPrettyTimeStamp(), msg);
            }
        },

        /**
         * Log a warning
         * @method warn
         * @param {String} msg
         * @param {*} data
         */
        warn: function (msg, data) {
            console.warn(getPrettyTimeStamp(), msg + ':', data);
        }
    };
});