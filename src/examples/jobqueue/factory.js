var isPaused = false;

self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'pause':
            isPaused = true;
            break;
        case 'resume':
            isPaused = false;
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

    if (isPaused) return;

    setTimeout(function () {
        self.postMessage({number: (Math.random() * 5000 ) | 0});
        start();
    }, 10000);


}