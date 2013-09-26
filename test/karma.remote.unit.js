// Karma configuration
module.exports = function (config) {

    config.set({

        // base path, that will be used to resolve files and exclude
        basePath : '',

        browserStack : {
            startTunnel : false
        },

        // frameworks to use
        frameworks   : [ 'mocha', 'chai'],


        // list of files / patterns to load in the browser
        files        : [
            'unit/*.js'
        ],


        // list of files to exclude
        exclude      : [

        ],


        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters    : ['progress'],


        // web server port
        port         : 9876,


        // enable / disable colors in the output (reporters and logs)
        colors       : true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel     : config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch    : false,


        customLaunchers : {
            bs_firefox_mac : {
                base            : 'BrowserStack',
                browser         : 'firefox',
                browser_version : '21.0',
                os              : 'OS X',
                os_version      : 'Mountain Lion'
            },
            bs_iphone5     : {
                base       : 'BrowserStack',
                device     : 'iPhone 5',
                os         : 'ios',
                os_version : '6.0'
            }
        },


        browsers       : ['bs_firefox_mac', 'bs_iphone5'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout : 60000,


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun      : true

    });
};
