/**
 * @class Worker
 *
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


        function workerErrorHandler(e) {
            logger.log('Worker', 'error occured', e);
        }

        function workerMessageHandler(e) {
            // Convert worker-message to event
            _self.emit(e.data.type.toLowerCase(), {id: _self.id, data: e.data.data });

        }

        this.start = function () {

            _webworker = new WebWorker(url);
            _webworker.addEventListener('message', workerMessageHandler);
            _webworker.addEventListener('error', workerErrorHandler);

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
            console.log('pushing', job);
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