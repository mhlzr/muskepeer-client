/**
 *
 */


define(function () {

    var tasks = [];

    return{

        size: tasks.length,

        add: function (task) {
            tasks.push(task);
            this.size = tasks.length;
        },

        clear: function () {
            tasks = [];
            this.size = 0;
        },

        getNext: function () {
            return tasks.shift();
        },

        getByUid: function (id) {
            //TODO Task Model
        },


        remove: function () {
            this.size = tasks.length;
        }

    }
});
