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
        project: 'https://www.muskepeer.net/examples/jobqueue/settings.json',
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

