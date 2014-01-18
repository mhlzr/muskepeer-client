var job;

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
            self.close();
            break;
        case 'job' :
            job = e.data.job;
            start();
            break;
        default:
            break;
    }
});

function start() {

    // Need a job?
    if (!job) {
        self.postMessage({type: 'job:required' });
        return;
    }

    // Solve
    self.postMessage({type: 'result:found', data: {job: job, result: isPrimeNumber(job.parameters.number)}});

    job = undefined;
    start();

}


function isPrimeNumber(number) {

    var i = number;

    if (number > 2 && number % 2) return false;

    while (i--) {

        if (i === 0 || i === 1 || i === number)
            continue;

        if (!(number % i))
            return false;
    }

    return true;

}
