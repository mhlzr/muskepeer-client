/**
 *
 * @module Computation
 */

define(function (require) {

    var MAX_WORKERS = 2;

    function onTaskStart() {
    }

    function onTaskComplete() {
    }

    function onTaskError() {
    }

    return {

        currentTasks: [],
        tasks: [],
        hasTasks: false,
        isRunning: false,
        isPaused: false,
        workers: [],

        start: function () {
        },
        pause: function () {
        },
        resume: function () {
        },
        stop: function () {
        }
    }

});