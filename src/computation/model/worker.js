/**
 * @class Worker
 */

define(['eventemitter2'], function (EventEmitter) {

    var WebWorker = window.Worker;

    return function Worker(url) {

        var _self = this,
            _webworker,
            _ee = new EventEmitter({delimiter: ':'});

        this.id = null;

        this.emit = _ee.emit;
        this.on = _ee.on;
        this.off = _ee.off;
        this.onAny = _ee.onAny;
        this.offAny = _ee.onAny;

        this.isRunning = false;
        this.isPaused = false;

        function workerMessageHandler(e) {
            _self.emit(e.data.type.toLowerCase(), {id: self.id, data: e.data });
        }

        function workerErrorHandler(e) {
            logger.log('Worker', 'error occured', e);
        }

        this.start = function () {

            _webworker = new WebWorker(url);
            _webworker.addEventListener('message', workerMessageHandler, false);
            _webworker.addEventListener('error', workerErrorHandler, false);

            this.isRunning = true;
            this.isPaused = false;

            _webworker.postMessage({cmd: 'start'});

        };

        this.stop = function () {
            _webworker.postMessage({cmd: 'stop'});
            _webworker.removeEventListener('message', workerMessageHandler);
            _webworker.removeEventListener('error', workerErrorHandler);
            _webworker.terminate();
            _webworker = null;
            this.isRunning = false;
            this.isPaused = true;
        };

        this.pause = function () {
            _webworker.postMessage({cmd: 'pause'});
            this.isPaused = true;
            this.isRunning = false;
        };

        this.resume = function () {
            _webworker.postMessage({cmd: 'resume'});
            this.isPaused = false;
            this.isRunning = true;
        };

        this.pushJob = function (job) {
            _webworker.postMessage({cmd: 'job', job: job});
        };

        this.pushFile = function (fileInfo, file) {
            _webworker.postMessage({cmd: 'file', fileInfo: fileInfo, file: file});
        };

        this.pushResult = function (result) {
            _webworker.postMessage({cmd: 'result', result: result});
        };

    };
});