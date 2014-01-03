self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'pause':
            self.postMessage({type: 'pause'});
            break;
        case 'resume':
            self.postMessage({type: 'resume'});
            break;
        case 'start':
            self.postMessage({type: 'start'});
            process();
            break;
        case 'stop':
            self.postMessage({type: 'stop'});
            break;
        default:
            break;
    }
});

function process() {
    setInterval(function () {
        self.postMessage({type: 'result', data: (Math.random() * 5000) | 0});
    }, Math.random() * 60000);
}
