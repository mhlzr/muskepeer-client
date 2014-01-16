/**
 *
 */

//resolveLocalFileSystemSyncURL = webkitResolveLocalFileSystemSyncURL || resolveLocalFileSystemSyncURL;

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

                console.log(e.data.file);
                //trainingFile = resolveLocalFileSystemSyncURL(e.data.file);
                //console.log(trainingFile);

                 convertFileToJSON(e.data.file, function (json) {
                     self.postMessage('got json');
                     trainingData = json;
                     self.postMessage(json);
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
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'blob'} });
        return;
    }

    if (!job) {
        self.postMessage({ type: 'job:pull' });
        return;
    }

}


function convertFileToJSON(file, callback) {

    var reader = new FileReader();

    reader.onload = function (e) {
        console.log(e);
        self.postMessage('converted');
        callback(JSON.parse(e.target.result));
    };

    reader.readAsText(file);

    console.log(file, reader);


}

