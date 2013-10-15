require.config({
    paths: {
        'lodash': 'lib/lodash/dist/lodash',
        'eventemitter2': 'lib/eventemitter2/lib/eventemitter2',
        'observe-shim': 'lib/oberserve-shim/lib/observe-shim',
        'q': 'lib/q/q'

    }
});

require(['musketeer-client'], function (Musketeer) {
    console.log(Musketeer);
    window.Musketeer = Musketeer.init();
});

