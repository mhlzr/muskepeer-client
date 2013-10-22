/**
 * @author Matthieu Holzer
 * @date 22.10.13
 * @class GeoLocation
 */

define(['q'], function (Q) {

    var EARTH_RADIUS = 6371; // Radius of the earth in km


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

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    deferred.resolve({
                        lat: position.coords.latitude,
                        long: position.coords.longitude
                    });
                },
                function () {
                    deferred.reject();
                }, { enableHighAccuracy: true }
            );

            return deferred.promise;
        },

        /**
         * Uses the Haversine formula to calculate the distance between two locations
         * @param position1
         * @param position2
         *
         * @returns distance Float distance in kilometers
         */
        getDistanceBetweenTwoLocations: function (position1, position2) {

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