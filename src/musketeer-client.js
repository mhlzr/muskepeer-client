/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */


(function () {

    "use strict";

    var musketeer = {
        //TODO: generate mask for this
        STATES: {
            DATA_NEEDED: 'DATA_NEEDED',
            TASK_NEEDED: 'TASK_NEEDED',
            LOADING_AND_COMPUTING: '',
            LOADING: '',
            COMPUTING: ''
        }
    };

    var _bridge;

    musketeer.init = function (bridge) {

        function testRequirements() {
            return JSON && localStorage && Object.observe && indexedDB;
        }

        _bridge = bridge;
        console.log(bridge);
        return this;
    };

    /**
     * @module Settings
     */
    musketeer.settings = function () {

        var _settings = readSettingsFromLocalStorage();

        Object.observe(_settings, storeSettingsToLocalStorage);

        function readSettingsFromLocalStorage() {
            return JSON.parse(localStorage.getItem('settings')) || {};
        }

        function storeSettingsToLocalStorage() {
            console.log('settings update');
            localStorage.setItem('settings', JSON.stringify(_settings));
        }

        return _settings;

    }();

    /**
     * @module Projects
     */
    musketeer.projects = function () {
        var _list;

        //create list if not existent
        if (!musketeer.settings.projects) {
            musketeer.settings.projects = [];
        }
        _list = musketeer.settings.projects;

        return {
            list: _list,
            join: function (projectId) {
                //already joined
                if (_list.indexOf(projectId) > 0) return;
                _list.push(projectId);
            },
            leave: function (projectId) {
                var pos = _list.indexOf(projectId);
                //in list?
                if (pos < 0) return;
                _list.splice(pos, 1);
            }
        }
    }();

    /**
     *
     * @module Computation
     */
    musketeer.computation = function () {
        var MAX_WORKERS = 2;

        function onTaskStart() {
        }

        function onTaskComplete() {
        }

        function onTaskError() {
        }

        return {
            currentTasks: [],
            tasks: [],
            hasTasks: false,
            isRunning: false,
            isPaused: false,
            workers: []
        }
    }();
    musketeer.computation.start = function () {
    };
    musketeer.computation.pause = function () {
    };
    musketeer.computation.resume = function () {
    };
    musketeer.computation.stop = function () {
    };

    /**
     *
     * @module Network
     *
     */
    musketeer.network = function () {
        var nodes = [],
            peers = [];
        return{

            uid: null
        }
    }();

    musketeer.network.connectToNode = function (host, port) {

    };

    musketeer.network.connectToPeer = function (uid) {

    };

    musketeer.network.connectToAllPeers = function () {

    };

    musketeer.network.getPeerListFromConnectedNodes = function () {

    };

    musketeer.network.sendToPeer = function (peerId, key, data) {
    };
    musketeer.network.sendToNode = function (nodeId, key, data) {
    };
    /**
     * Send data to all nodes and peers
     * @param key
     * @param data
     */
    musketeer.network.broadcast = function (key, data) {

    };

    /**
     *
     * @module Storage
     *
     */
    musketeer.storage = function () {

        function isValidKey(key) {
            //TODO define standard for keys
            return key.length === 12;
        }

        var db, request, stores = [];


        //open db
        request = indexedDB.open("musketeer");
        request.onsuccess = function (e) {
            console.log('db open');
            db = e.target.result;
            // createStore('files', 'id');
        };

        function createStore(title, keypath) {
            console.log('store create', db.objectStoreNames);

            //does the objectstore already exist?
            if (db.objectStoreNames.contains(title)) {
                return;
            }

            stores.push(db.createObjectStore(title, {keyPath: keypath}));

        }

        return {
            read: function (key) {
                if (!key) throw Error('File-Key is missing');
                if (!isValidKey(key)) throw new TypeError('File-Key is invalid');

                var deferred = Q.defer();

                //local stuff
                //if locally not found, ask the network
                console.log(musketeer.network.broadcast('DATA_NEEDED', {id: '0815' }));
                return deferred.promise;

            },
            store: function (storeName, data) {
                console.log(stores);
                stores[0].put({title: "Quarry Memories", author: "Fred", id: 123456});
                var deferred = Q.defer();
                return deferred.promise;

            }

        }
    }();


    /**
     * EXPORT
     */
//allow this to be used in node, amd or global
    if (typeof module != 'undefined' && module.exports && process) {
        module.exports = musketeer;
    }
    else if (typeof define == 'function' && define.amd) {
        return musketeer;

    }
    else if (typeof window != 'undefined') {
        window.Musketeer = musketeer;
    }


}());