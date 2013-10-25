self.addEventListener('message', function (e) {
    self.postMessage(e.data);

    if (!e.data.cmd) return;

    switch (e.data.cmd.toLowerCase()) {
        case 'pause':
            break;
        case 'resume':
            break;
        case 'start':
            break;
        case 'stop':
            break;
        default:
            break;
    }
});
