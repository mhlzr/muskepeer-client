/**
 *
 */

var trainingFile,
    trainingData;

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
                trainingFile = new Blob([e.data.file], {type: 'application/json'});
                // trainingFile = new Blob(['{"foo":"bar"}'], {type: 'application/json'});
                getJSONFromBlob(trainingFile, function (json) {
                    trainingData = json;
                    console.log(trainingData);
                    start();
                });

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
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'arrayBuffer'} });
        return;
    }

    if (!job) {
        self.postMessage({ type: 'job:pull' });
        return;
    }

}


function getJSONFromBlob(file) {

    var data = new FileReaderSync().readAsText(file);
    console.log(data);
    return JSON.parse(data);
}

