/**
 * @class Project
 */

define([], function () {
    return {
        computation: {
            worker: {
                algorithm: function () {
                    window.URL = window.URL;

                    var response = "self.onmessage=function(e){postMessage('Worker: '+e.data);}";

                    var blob;
                    try {
                        blob = new Blob([response]);
                    } catch (e) {
                        window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
                        blob = new BlobBuilder();
                        blob.append(response);
                        blob = blob.getBlob();
                    }

                    return blob;
                }
            }
        }
    }
});