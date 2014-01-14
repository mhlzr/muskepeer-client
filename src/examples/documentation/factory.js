var interval;

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
            self.close();
            break;
        case 'job' :
            //e.data.job
            break;
        case 'file' :
            //e.data.fileInfo
            //e.data.file
            break;
        case 'result' :
            //e.data.result
            break;
        default:
            break;
    }
});

function start() {

    interval = setInterval(function () {
        self.postMessage({type: 'job:found', data: parseInt(Math.random() * 1000)});
    }, (Math.random() * 500) | 0);

}
