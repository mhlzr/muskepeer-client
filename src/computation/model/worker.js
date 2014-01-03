/**
 * @author Matthieu Holzer
 * @date 08.12.13
 */

define(['eventemitter2'], function (EventEmitter) {

    var WebWorker = window.Worker;

    var _webworker,
        _ee = new EventEmitter({delimiter: ':'});


    function workerErrorHandler(e) {
        logger.log('Worker', 'error occured', e);
    }

    function workerMessageHandler(e) {
        console.log(e.data);

        switch (e.data.type.toLowerCase()) {
            case 'result' :
                _ee.emit('result', e.data.data);
                break;
            case 'error' :
                _ee.emit('error', e.data.data);
                break;
            case 'dependency' :
                _ee.emit('dependency', e.data.data);
                break;
        }
    }


    return function Worker(url) {

        this.id = null;

        this.emit = _ee.emit;
        this.on = _ee.on;
        this.off = _ee.off;
        this.any = _ee.any;

        this.isRunning = false;
        this.isPaused = false;

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

        this.process = function (job) {
            if (this.isRunning && !this.isPaused) {
                _job = job;
                _webworker.postMessage({cmd: 'process', job: job});
            }
        };


    };
});