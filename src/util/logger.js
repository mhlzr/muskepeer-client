/**
 * @author Matthieu Holzer
 * @date 12.11.13
 * @module Logger
 * @class Logger
 */

define(['lodash'], function (_) {

    var MAX_MESSAGES = 100;

    var output = document.getElementsByTagName('output')[0],
        htmlLogging = true,
        msgAmount = 0;

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

        if (!output) {
            htmlLogging = false;
        }

        if (msgAmount >= MAX_MESSAGES) {
            output.innerHTML = '';
            console.clear();
            msgAmount = 0;
        }

        var origin = args[0],
            data = Array.prototype.slice.call(args, 1),
            dataAsString = _.clone(data);

        //Console
        console[type].apply(console, [getPrettyTimeStamp(), origin, ':'].concat(data));

        //DOM
        if (htmlLogging) {

            dataAsString.forEach(function (el, id) {
                if (_.isObject(el)) {
                    dataAsString[id] = '<em style="color:blue">' + JSON.stringify(el) + '</em>';
                }
            });

            output.innerHTML += getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>';

        }

        msgAmount++;


    }


    return {

        /**
         * @method disableHTMLLog
         * @default true
         */
        disableHTMLLog: function () {
            htmlLogging = false;
        },


        /**
         * @method enableHTMLLog
         * @default true
         */
        enableHTMLLog: function () {
            htmlLogging = true;
        },

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