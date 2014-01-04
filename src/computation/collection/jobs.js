/**
 * @class Jobs
 * @module Jobs
 */


define(['storage/index'], function () {

    var _jobs = [];

    return{

        list: _jobs,
        size: _jobs.length,

        add: function (job) {

            if (!job.uuid || this.getJobByUuid(job.uuid) != null) return;
            _jobs.push(job);
            this.size = _jobs.length;
        },

        clear: function () {
            _jobs = [];
            this.size = 0;
        },

        getNext: function () {
            return _jobs.shift();
        },

        getJobByUuid: function (uuid) {
            return _.find(_jobs, function (job) {
                return job.uuid === uuid;
            });
        },


        remove: function () {
            this.size = _jobs.length;
        }

    }
});
