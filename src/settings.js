/**
 * Store for User-Settings which will be saved/read from
 * localStorage
 *
 * @module Settings
 * @class Settings
 */

define(['lodash', './uuid', 'observe-js'], function (_, uuid) {

    /**
     *
     * @type {String}
     * @private
     * @default 'settings'
     */
    var _storeName = 'settings',
        /**
         *
         * @type {*}
         * @private
         */
            _settings = readSettingsFromLocalStorage();


    /**
     * @private
     * @method readSettingsFromLocalStorage
     * @return {Object} Settings
     */
    function readSettingsFromLocalStorage() {
        return JSON.parse(localStorage.getItem(_storeName)) || {};
    }

    /**
     * @private
     * @method storeSettingsToLocalStorage
     */
    function storeSettingsToLocalStorage() {
        localStorage.setItem(_storeName, JSON.stringify(_settings));
    }


    //Chrome is currently the only one supporting native O_o
    //which would be Object.observe(_settings, storeSettingsToLocalStorage);
    var observer = new ObjectObserver(_settings, storeSettingsToLocalStorage);

    //Defaults
    _.defaults(_settings, {
        authToken: uuid.generate(), //will never be sent to any peer (private)
        i18n: 'en_GB',
        maxPeers: 3,
        maxWorkers: 1,
        fileStorageSize: 500 * 1024 * 1024, //500MB
        stunServer: 'stun:stun.l.google.com:19302',
        syncInterval: 3600000, //1h
        uuid: uuid.generate() //everyone will know (public)
    });

//TODO remove testing-line
   // _settings.uuid = uuid.generate();

    return _settings;

})
;