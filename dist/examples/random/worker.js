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
        //self.postMessage({type: 'result', data: ( Math.random() * Number.MAX_VALUE )});
        self.postMessage({type: 'result:found', data: parseInt(Math.random() * 20)});
    }, (Math.random() * 1000) | 0);
    isRunning = true;

    //Testing
    self.postMessage({type: 'result:required', data: {uuid: '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3'}});
    self.postMessage({type: 'job:required', data: {uuid: 'c25945fcf5508f52661464831d54de84a228bad76a9474222fb2aa1d7a7d5850'}});
    self.postMessage({type: 'job:required' });
    self.postMessage({type: 'file:required', data: {uri: 'https://dl.dropboxusercontent.com/u/959008/webstorm.pdf'} });
    self.postMessage({type: 'job:found', data: { a: 10, b: 20, c: 50} });
    self.postMessage({type: 'file:found', data: {} });


}


function stop() {
    if (interval) clearInterval(interval);
    isRunning = false;
}