/**
 * FileStorage
 * @module Storage
 *
 * http://www.peterkroener.de/indexed-db-die-neue-html5-datenbank-im-browser-teil-1-ein-kurzer-ueberblick/
 */

define(function (require) {


    var _dbName = 'musketeer',
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
});