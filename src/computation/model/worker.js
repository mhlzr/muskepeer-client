/**
 * @author Matthieu Holzer
 * @date 08.12.13
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

        this.isRunning = false;
        this.isPaused = false;


        function workerErrorHandler(e) {
            logger.log('Worker', 'error occured', e);
        }

        function workerMessageHandler(e) {

            switch (e.data.type.toLowerCase()) {
                case 'result:found' :
                    _self.emit('result:found', {id: _self.id, result: e.data.data });
                    break;
                case 'error' :
                    _self.emit('error', e.data.data);
                    break;
                case 'dependency' :
                    _self.emit('dependency', e.data.data);
                    break;
            }
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

    };
});