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

require(['muskepeer-client', 'util/logger', 'domready'], function (Muskepeer, Logger) {

    window.Muskepeer = Muskepeer.init();

    window.logger = Logger;

    Muskepeer.start({
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
            }
        },
        nodes: [
            /*{
                host: 'muskepeer-node01.herokuapp.com',
                isSecure: true,
                port: 8080
            },*/
            {
                host: '192.168.178.26',
                isSecure: false,
                port: 8080
            }
        ]
    });

    document.write(Muskepeer.settings.uuid);
});

