/**
 * @class Project
 */

define([], function () {
    return {

        files: [
            'https://dl.dropboxusercontent.com/u/959008/webstorm.pdf',
            'https://dl.dropboxusercontent.com/u/959008/paris.jpg',
            'https://dl.dropboxusercontent.com/u/959008/download.pdf',
            'https://dl.dropboxusercontent.com/u/959008/p2p.pdf'
        ],
        computation: {

            jobs: {
                autoGeneration: true,
                createJobParameters: function (index) {
                    var a = Math.random() * 10 | 0,
                        b = Math.random() * 10 | 0;

                    console.log(index);
                    return{
                        a: a, b: b
                    }

                },
                list: 'http://www.google.de', //file-hash (blob), url
                groupSize: 100
            },


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