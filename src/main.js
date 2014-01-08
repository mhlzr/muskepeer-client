require.config({
    paths: {
        'domready': 'lib/requirejs-domready/domReady',
        'lodash': 'lib/lodash/dist/lodash',
        'eventemitter2': 'lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': 'lib/idbwrapper/idbstore',
        'node-uuid': 'lib/node-uuid/uuid',
        'observe-js': 'lib/observe-js/src/observe',
        'q': 'lib/q/q',
        'sjcl': 'lib/sjcl/sjcl',
        'sockjs': 'lib/sockjs/sockjs'

    },
    shim: {
        'sjcl': {
            exports: 'sjcl'
        }
    }
});

require(['muskepeer-client', 'util/logger', 'domready'], function (Muskepeer, Logger) {

    window.Muskepeer = Muskepeer.init();

    window.logger = Logger;

    Muskepeer.start({
        project: {
            "uuid": "d34ebd37-927a-426a-b762-87fb73c04159",
            "title": "n-Queens solver",
            "description": "Will find distinct solutions for the n-queens problem.",
            "publicKey": "",

            "author": "Matthieu Holzer",
            "website": "",
            "version": "0.0.1",
            "active": true,

            "computation": {

                "offlineAllowed": true,
                "workerUrl": "https://dl.dropboxusercontent.com/u/959008/examples/n-queens/worker.js",
                "resultGroupSize": 1,
                "validationIterations": 0,

                "expectedResults": 2680, //11 queens

                "useJobList": false,

                "storages": [
                    {
                        "enabled": true,
                        "url": "https://api.parse.com/1/classes/Queens/",
                        "type": "REST",
                        "params": {},
                        "headers": [
                            {
                                "key": "X-Parse-Application-Id",
                                "value": "ZzIHMKfVQmIni0K5fBdYgXxTlXyoovbm4gm0Epdq"
                            },
                            {
                                "key": "X-Parse-REST-API-Key",
                                "value": "4Izw5bddA34RFUmOuGCYrMHn4zY5dz62ETAVb2g5"
                            }
                        ]
                    }
                ]
            },

            "network": {
                "useGeoLocation": true
            }

        },
        nodes: [
            {
                host: 'node01-muskepeer.rhcloud.com',
                isSecure: true,
                port: 8443
            },
            {
                host: 'node02-muskepeer.rhcloud.com',
                isSecure: true,
                port: 8443
            }/*,
             {
             host: '192.168.178.26',
             isSecure: false,
             port: 8080
             }*/

        ]
    });

    logger.log('Uuid', Muskepeer.settings.uuid);
});

