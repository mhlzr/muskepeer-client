/**
 *
 */


var trainingFile;

/**********************************************
 * COMMUNICATION BLOCK START
 **********************************************/
self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'start':
            start();
            break;
        case 'job' :
            //e.data.job
            start(e.data.job);
            break;
        case 'file' :
            if (e.data.fileInfo.name === 'training') {
                trainingFile = e.data.file;
            }
            //e.data.fileInfo
            //e.data.file
            break;
        default:
            break;
    }
});
/**********************************************
 * COMMUNICATION BLOCK END
 **********************************************/

function start(job) {

    if (!trainingFile) {
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'blob'} });
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'dataUrl'} });
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'localUrl'} });
        return;
    }

    if (!job) {
        self.postMessage({ type: 'job:pull' });
        return;
    }


}