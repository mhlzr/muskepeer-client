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


    //Chrome is currently the only one supporting
    //Object.observe(_settings, storeSettingsToLocalStorage);

    new PathObserver(_settings, storeSettingsToLocalStorage);

    //Defaults
    _.defaults(_settings, {
        i18n: 'en_GB',
        uuid: uuid.generate(), //everyone will know (public)
        authToken: uuid.generate(), //will never be sent to any peer (private)
        maxWorkers: 2
    });


    return _settings;

});