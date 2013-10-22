/**
 * @class Project
 */

define(['lodash'], function (_) {

    var defaults = {


    };


    return {
        create: function (project) {
            return _.defaults(project, defaults);
        }
    }
});