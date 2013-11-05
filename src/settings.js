/**
 * Store for User-Settings which will be saved/read from
 * localStorage
 *
 * @module Settings
 * @constructor
 * @param storeName String Keyname for the settings object in localStorage
 */

define(['lodash', './uuid'], function (_, uuid) {

    var _storeName = 'settings',
        _settings = readSettingsFromLocalStorage();

    //Register Observer
    Object.observe(_settings, storeSettingsToLocalStorage);

    //Defaults
    _.defaults(_settings, {
        i18n: 'en_GB',
        uuid: uuid.generate(), //everyone will know (public)
        authToken: uuid.generate(), //will never be sent to any peer (private)
        maxWorkers: 2
    });

    function readSettingsFromLocalStorage() {
        return JSON.parse(localStorage.getItem(_storeName)) || {};
    }

    function storeSettingsToLocalStorage() {
        localStorage.setItem(_storeName, JSON.stringify(_settings));
    }

    return _settings;

});