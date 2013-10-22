/**
 * Storage
 * @module Storage
 *
 * https://github.com/jensarps/IDBWrapper
 * http://www.peterkroener.de/indexed-db-die-neue-html5-datenbank-im-browser-teil-1-ein-kurzer-ueberblick/
 */

define(['musketeer-module', 'idbwrapper'], function (MusketeerModule, IDBStore) {


    var module = new MusketeerModule(),
        store = new IDBStore({
            storeName: 'Musketeer',
            storePrefix: ''
        }, function storeReadyHandler() {
            console.log('done');
        }, function storeErrorHandler(err) {

        });


    return module.extend({
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

    });
});