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
            break;
        case 'stop':
            self.postMessage({type: 'stop'});
            break;
        case 'process':
            self.postMessage({type: 'process'});
            // process();
            break;
        default:
            break;
    }
});

function process() {
    setInterval(function () {
        self.postMessage({type: 'result', data: Math.random() * 5000});
    }, Math.random() * 1000);
}
