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
     * Store for User-Settings which will be saved/read from
     * localStorage
     *
     * @module Settings
     * @constructor
     * @param storeName String Keyname for the settings object in localStorage
     */
    musketeer.settings = function (storeName) {

        var _storeName = storeName || 'settings',
            _settings = readSettingsFromLocalStorage();

        //Defaults
        _settings.projects = _settings.projects || [];

        //Register Oberserver
        Object.observe(_settings, storeSettingsToLocalStorage);
        //Even for all keys
        Object.keys(_settings).forEach(function (key) {
            Object.observe(_settings[key], storeSettingsToLocalStorage)
        });

        function readSettingsFromLocalStorage() {
            return JSON.parse(localStorage.getItem(_storeName)) || {};
        }

        function storeSettingsToLocalStorage() {
            localStorage.setItem(_storeName, JSON.stringify(_settings));
        }

        return _settings;

    }();

    /**
     * @module Projects
     */
    musketeer.projects = function () {
        var _list = musketeer.settings.projects;

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
     * FileStorage
     * @module Storage
     *
     * http://www.peterkroener.de/indexed-db-die-neue-html5-datenbank-im-browser-teil-1-ein-kurzer-ueberblick/
     */
    musketeer.storage = function (dbName) {

        var _dbName = dbName || 'musketeer',
            _db,
            _request;

        //Open/Create Database
        _request = indexedDB.open(_dbName);

        _request.onsuccess = function (e) {
            _db = e.target.result;
        };

        _request.onupgradeneeded = function () {
            _db = this.result;
            if (!hasStore('files')) createStore('files', 'id');
        };

        _request.onerror = _request.onblocked = function () {
            console.error('Can\'t create/open database');
        };

        var hasStore = function (storeName) {
            return _db && _db.objectStoreNames.contains(storeName);
        };

        function createStore(title, keypath) {
            _db.createObjectStore(title, {keyPath: keypath});

        }


        return {
            isValidKey: function (key) {
                //TODO define standard for keys
                return true;
            },
            read: function (storeName, key) {
                if (!key) throw Error('File-Key is missing');
                if (!this.isValidKey(key)) throw new TypeError('File-Key is invalid');

                var deferred = Q.defer();

                //local stuff
                //if locally not found, ask the network
                //console.log(musketeer.network.broadcast('DATA_NEEDED', {id: '0815' }));
                return deferred.promise;

            },
            save: function (storeName, data) {
                var deferred = Q.defer(),
                    transaction,
                    request,
                    store;

                console.log(_db, hasStore(storeName));

                if (!hasStore(storeName) || !data.hasOwnProperty('id') || !this.isValidKey(data.id)) {
                    console.log(data, data.id, 'fail');
                    deferred.reject();
                    return deferred.promise;
                }

                //Create a transaction with RW-rights
                transaction = _db.transaction([storeName], 'readwrite');


                //Get the object-store
                store = transaction.objectStore(storeName);
                request = store.put(data);

                console.log('saved');
                request.onsuccess = function (e) {
                    deferred.resolve()
                };
                request.onerror = function (e) {
                    deferred.reject()
                };

                return deferred.promise;

            },
            remove: function () {
            },
            update: function () {
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