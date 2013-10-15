/**
 * @module Projects
 */

define(function (require) {

    var settings = require('settings'),
        _list = settings.projects;

    return {
        list: _list,
        join: function (projectId) {
            //already joined
            if (_list.indexOf(projectId) > 0) return;
            _list.push(projectId);
        },
        leave: function (projectId) {
            var pos = _list.indexOf(projectId);
            //in list?
            if (pos < 0) return;
            _list.splice(pos, 1);
        }
    }
});