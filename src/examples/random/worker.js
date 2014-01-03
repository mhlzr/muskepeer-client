var interval,
    isRunning;

self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'pause':
            break;
        case 'resume':
            break;
        case 'start':
            start();
            break;
        case 'stop':
            stop();
            break;
        default:
            break;
    }
});

function start() {
    interval = setInterval(function () {
        //self.postMessage({type: 'result', data: ( Math.random() * Number.MAX_VALUE )});
        self.postMessage({type: 'result', data: parseInt(Math.random() * 20)});
    }, (Math.random() * 60000) | 0);
    isRunning = true;
}


function stop() {
    if (interval) clearInterval(interval);
    isRunning = false;
}
