var interval,
    isRunning;

/**********************************************
 * COMMUNICATION BLOCK START
 **********************************************/
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
/**********************************************
 * COMMUNICATION BLOCK END
 **********************************************/

function start() {

    /*interval = setInterval(function () {
     self.postMessage({type: 'result:push', data: parseInt(Math.random() * 1000)});
     }, (Math.random() * 1000) | 0);
     isRunning = true;*/

    //Testing

    self.postMessage({ type: 'result:push', data: { a: 10, b: 'Foo'}});
    self.postMessage({ type: 'result:pull', data: {uuid: '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3'}});

    self.postMessage({ type: 'job:push', data: { a: 10, b: 20, c: 50} });

    self.postMessage({ type: 'job:pull', data: {uuid: 'c25945fcf5508f52661464831d54de84a228bad76a9474222fb2aa1d7a7d5850'}});
    self.postMessage({ type: 'job:pull' });

    self.postMessage({ type: 'file:pull', data: {url: 'https://dl.dropboxusercontent.com/u/959008/webstorm.pdf'} });
    self.postMessage({ type: 'file:pull', data: {name: 'webstorm', type: 'localUrl', offset: 0} });
    self.postMessage({ type: 'file:pull', data: {name: 'webstorm', type: 'blob', offset: 1234} });
    self.postMessage({ type: 'file:pull', data: {name: 'webstorm', type: 'dataUrl'} });
    self.postMessage({ type: 'file:pull', data: {name: 'webstorm', type: 'path'} });


    self.postMessage({ type: 'file:push', data: {} });


}


function stop() {
    if (interval) clearInterval(interval);
    isRunning = false;
}
