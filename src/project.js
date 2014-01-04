/**
 * @class Project
 */

define([], function () {
    return {

        "uuid": "2345678902765456789",
        "title": "Random Result Generator",
        "description": "Will create random results between 0 and 10.000",
        "publicKey": "",

        "author": "Matthieu Holzer",
        "website": "",
        "version": "0.0.1",
        "active": true,

        "computation": {

            "offlineAllowed": true,

            "workerUrl": "https://dl.dropboxusercontent.com/u/959008/random.js",
            "resultGroupSize": 1, //how much results to collect before broadcast
            "validationIterations": -1, //-1 : Inifinite, 0 : None; >0 : Amount,

            "useJobList": true, //create and store jobs from worker
            "jobFactoryUrl": "https://dl.dropboxusercontent.com/u/959008/factory.js",
            "jobGroupSize": 1, //how much jobs to create before broadcast

            "storages": [
                {
                    "enabled": true,
                    "url": "https://api.parse.com/1/classes/Results/",
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
        },

        "files": [
            "https://dl.dropboxusercontent.com/u/959008/webstorm.pdf",
            "https://dl.dropboxusercontent.com/u/959008/download.pdf"
        ]
    }
});