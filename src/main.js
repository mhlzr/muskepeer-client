require.config({
    paths: {
        'domready': 'lib/requirejs-domready/domReady',
        'lodash': 'lib/lodash/dist/lodash',
        'eventemitter2': 'lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': 'lib/idbwrapper/idbstore',
        'node-uuid': 'lib/node-uuid/uuid',
        'observe-shim': 'lib/observe-shim/lib/observe-shim',
        'q': 'lib/q/q',
        'sjcl': 'lib/sjcl/sjcl',
        'sockjs': 'lib/sockjs/sockjs'

    },
    shim: {
        'sjcl': {exports: 'sjcl'}
    }
});

require(['musketeer-client', 'util/logger', 'domready'], function (Musketeer, Logger) {

    window.Musketeer = Musketeer.init();

    window.logger = Logger;

    Musketeer.start({
        project: {
            uuid: '2345678902765456789',
            title: 'TestProject',
            active: true,

            owner: {
                email: 'matthieholzer@gmx.de',
                name: 'Matthieu Holzer',
                publicKey: ''
            },

            computation: {
                hasDependingTasks: false,
                hasFiniteTasks: true,
                hasDataFiles: false,
                validationIterations: -1 //-1 : Inifinite, 0 : None; >0 : Amount,
            },

            network: {
                useGeoLocation: true
            }},
        nodes: [
            {
                host: '192.168.178.26',
                port: 8080
            }/*,
            {
                host: '192.168.178.21',
                port: 8080
            }*/
        ]
    });


    console.log(Musketeer);

    document.write(Musketeer.settings.uuid);
});

