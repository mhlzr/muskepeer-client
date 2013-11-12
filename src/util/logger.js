/**
 * @author Matthieu Holzer
 * @date 12.11.13
 */

define([], function () {

    function getPrettyTimeStamp() {
        var current = new Date(),
            date = [];
        date.push(current.getHours());
        date.push(current.getMinutes());
        date.push(current.getSeconds());
        return date.join(':');
    }

    return {
        log: function () {
            console.log(getPrettyTimeStamp(), arguments);
        },
        warn: function () {
            console.warn(getPrettyTimeStamp(), arguments);
        }
    };
});