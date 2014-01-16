/**
 *
 */

var testFile,
    testData;

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
        case 'file' :
            if (e.data.fileInfo.name === 'test') {

                testFile = new Blob([e.data.file], {type: e.data.fileInfo.type});
                var json = JSON.parse(new FileReaderSync().readAsText(testFile));
                testData = json.data;

                //testFile = null;

                start();
            }
            break;
        default:
            break;
    }
});
/**********************************************
 * COMMUNICATION BLOCK END
 **********************************************/

function start(job) {

    if (!testFile) {
        postMessage({ type: 'file:pull', data: {name: 'test', type: 'arrayBuffer'} });
        return;
    }

    var index = (testData.length * Math.random()) | 0,
        dataset = testData.splice(index, 1);

    postMessage({ type: 'job:push', data: {id: index, dataset: dataset}});

    // Come again
    setTimeout(start, 50);

}
