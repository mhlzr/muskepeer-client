require.config({
    paths: {
        q: 'lib/q/q'

    }
});

require(['musketeer-client'], function (Musketeer) {
    window.Musketeer = Musketeer.init();
});

