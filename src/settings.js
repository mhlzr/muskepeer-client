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
        i18n: 'en_GB',
        uuid: uuid.generate(), //everyone will know (public)
        authToken: uuid.generate(), //will never be sent to any peer (private)
        maxWorkers: 1,
        maxPeers: 3,
        stunServer: 'stun:stun.l.google.com:19302',
        fileStorageSize: 500 * 1024 * 1024 //500MB
    });

    //TODO remove testing-line
    _settings.uuid = uuid.generate();

    return _settings;

});