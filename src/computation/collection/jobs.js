/**
 *
 */


define(function () {

    var jobs = [];

    return{

        size: jobs.length,

        add: function (task) {
            jobs.push(task);
            this.size = jobs.length;
        },

        clear: function () {
            jobs = [];
            this.size = 0;
        },

        getNext: function () {
            return jobs.shift();
        },

        getByUuid: function (uuid) {
            //TODO Job Model
        },


        remove: function () {
            this.size = jobs.length;
        }

    }
});
