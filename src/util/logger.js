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

    function print(type, args) {


        if (args.length === 1) {
            document.write(getPrettyTimeStamp(), ' ', args[0] + '<br/>');
            console[type](getPrettyTimeStamp(), args[0]);
        }
        else if (args.length === 2) {
            document.write(getPrettyTimeStamp(), ' ', args[0] + ':', args[1] + '<br/>');
            console[type](getPrettyTimeStamp(),args[0] + ':', args[1]);
        }
        else if (args.length === 3) {
            document.write(getPrettyTimeStamp(), ' ', args[0], args[1], ':', args[2] + '<br/>');
            console[type](getPrettyTimeStamp(), args[0], args[1], ':', args[2]);
        }
        else if (args.length === 4) {
            document.write(getPrettyTimeStamp(), ' ', args[0], args[1], ':', args[2], args[3] + '<br/>');
            console[type](getPrettyTimeStamp(), args[0], args[1], ':', args[2], args[3]);
        }
        else {
            document.write(getPrettyTimeStamp(), ' ', args + '<br/>');
            console[type](getPrettyTimeStamp(), args);
        }
    }


    return {

        /**
         * Log some information
         *
         * @method log
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        log: function (msg, desc, data) {
            print('log', arguments);
        },

        /**
         * Log a warning
         *
         * @method warn
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        warn: function (msg, desc, data) {
            print('warn', arguments);
        },

        /**
         * Log an error
         *
         * @method error
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        error: function (msg, desc, data) {
            print('error', arguments);
        }
    };
});