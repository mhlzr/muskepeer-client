require.config({
    paths: {
        'lodash': 'lib/lodash/dist/lodash',
        'eventemitter2': 'lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': 'lib/idbwrapper/idbstore',
        'node-uuid': 'lib/node-uuid/uuid',
        'observe-shim': 'lib/observe-shim/lib/observe-shim',
        'q': 'lib/q/q',
        'sjcl': 'lib/sjcl/sjcl',
        'socket-io': 'lib/socket.io-client/dist/socket.io'

    },
    shim: {
        'sjcl': {exports: 'sjcl'}
    }
});

require(['musketeer-client'], function (Musketeer) {

    window.Musketeer = Musketeer.init();

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
                hasFiniteTasks: true,
                hasDataFiles: false,
                validationIterations: -1 //-1 : Inifinite, 0 : None; >0 : Amount,
            },

            network: {
                useGeoLocation: true
            }},
        nodes: [
            {
                host: '127.0.0.1',
                port: 8080
            }
        ]
    });

    console.log(Musketeer);
});

