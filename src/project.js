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
            "useJobList": false, //create and store jobs from worker
            "resultGroupSize": 1, //how much results to collect before broadcast
            "validationIterations": -1, //-1 : Inifinite, 0 : None; >0 : Amount,
            "storages": [
                {
                    "enabled": true,
                    "type": "rest",
                    "url": "http://www.parse.com",
                    "method": "post",
                    "params": {}
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