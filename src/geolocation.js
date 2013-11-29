/**
 * @author Matthieu Holzer
 * @date 22.10.13
 * @class GeoLocation
 */

define(['q', 'project'], function (Q, project) {

    var EARTH_RADIUS = 6371; // Radius of the earth in km

    var _location;


    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    return {

        /**
         * Asynchronously get the latitude/longitude of the device using the W3C-API
         * @returns {promise|*}
         */
        getGeoLocation: function () {

            var deferred = Q.defer();

            //don't return the actual location
            if (!project.network.useGeoLocation) {
                deferred.resolve(null);
            }

            //already cached?
            else if (project.network.useGeoLocation && _location) {
                deferred.resolve(_location);
            }

            //ask for it
            else {
                navigator.geolocation.getCurrentPosition(
                    function success(position) {
                        //caching
                        _location = {
                            lat: position.coords.latitude,
                            long: position.coords.longitude
                        };
                        deferred.resolve(_location);
                    },
                    function error() {
                        deferred.resolve(_location ? _location : null);
                    },
                    { enableHighAccuracy: true }
                );
            }

            return deferred.promise;
        },

        /**
         * Uses the Haversine formula to calculate the distance between two locations
         * @param position1
         * @param position2 (optional)
         *
         * @returns distance Float distance in kilometers
         */
        getDistanceBetweenTwoLocations: function (position1, position2) {

            position2 = position2 || _location;

            var dLat = deg2rad(position2.lat - position2.lat),
                dLon = deg2rad(position2.long - position1.long),

                a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                    + Math.cos(deg2rad(position2.lat)) * Math.cos(deg2rad(position2.lat))
                    * Math.sin(dLon / 2) * Math.sin(dLon / 2),

                c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return EARTH_RADIUS * c;
        }
    };
});