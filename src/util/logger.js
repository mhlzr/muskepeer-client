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
        log: function (msg, data) {
            if (data)
                console.log(getPrettyTimeStamp(), msg + ':', data);
            else
                console.log(getPrettyTimeStamp(), msg);
        },
        warn: function (msg, data) {
            console.warn(getPrettyTimeStamp(), msg + ':', data);
        }
    };
});