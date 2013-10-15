/**
 * Store for User-Settings which will be saved/read from
 * localStorage
 *
 * @module Settings
 * @constructor
 * @param storeName String Keyname for the settings object in localStorage
 */

define(function (require) {

    var _storeName = 'settings',
        _settings = readSettingsFromLocalStorage();

    //Defaults
    _settings.projects = _settings.projects || [];

    //Register Oberserver
   // Object.observe(_settings, storeSettingsToLocalStorage);
    //Even for all keys
    Object.keys(_settings).forEach(function (key) {
       // Object.observe(_settings[key], storeSettingsToLocalStorage)
    });

    function readSettingsFromLocalStorage() {
        return JSON.parse(localStorage.getItem(_storeName)) || {};
    }

    function storeSettingsToLocalStorage() {
        localStorage.setItem(_storeName, JSON.stringify(_settings));
    }

    return _settings;

});