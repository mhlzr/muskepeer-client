/**
 *
 **/

var trainingFile,
    testFile;

self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'pause':
            break;
        case 'resume':
            start();
            break;
        case 'start':
            start();
            break;
        case 'stop':
            break;
        default:
            break;
    }
});


function start() {

    if (!trainingFile) {
        self.postMessage({ type: 'file:required', data: {uri: 'https://muskepeer.net/examples/knn-digits/digits-train.json'}});
    }
}