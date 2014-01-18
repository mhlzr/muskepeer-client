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
            break;
        default:
            break;
    }
});


function start() {
    self.postMessage({a: 1, b: 2, c: 3});
    self.postMessage({a: 1, b: 1, c: 1});
    self.postMessage({a: 2, b: 2, c: 2});
    self.postMessage({a: 3, b: 3, c: 3});
}