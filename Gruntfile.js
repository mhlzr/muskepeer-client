module.exports = function (grunt) {


    /* Global Browser Paths for karma */
    process.env['CHROME_BIN'] = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    process.env['FIREFOX_BIN'] = 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe';
    process.env['OPERA_BIN'] = 'C:\\Program Files (x86)\\Opera\\launcher.exe';

    process.env['BROWSER_STACK_USERNAME'] = 'MatthieuHolzer';
    process.env['BROWSER_STACK_ACCESS_KEY'] = '2hdKPMJ1aRLkNAgoABJc';


    grunt.initConfig({

            pkg: grunt.file.readJSON('package.json'),


            connect: {
                server: {
                    options: {
                        base: 'src/',
                        keepalive: true,
                        port: 80
                    }
                }

            },

            jshint: {

                files: ['Gruntfile.js', 'src/**.js', '!src/js/lib/**', '!src/js/require*.js'],
                options: {
                    curly: true,
                    eqeqeq: true,
                    immed: true,
                    latedef: true,
                    newcap: true,
                    noarg: true,
                    sub: true,
                    undef: true,
                    boss: true,
                    eqnull: true,
                    browser: true,

                    globals: {
                        // AMD
                        module: true,
                        require: true,
                        requirejs: true,
                        define: true,

                        // Environments
                        console: true,
                        logger: true,
                        process: true,
                        self: true,

                        // Testing
                        sinon: true,
                        describe: true,
                        it: true,
                        expect: true,
                        beforeEach: true,
                        afterEach: true
                    }
                }
            },

            karma: {
                'local-unit-once': {
                    configFile: 'test/karma.local.unit.js'
                },
                'local-unit-watch': {
                    autoWatch: true,
                    configFile: 'test/karma.local.unit.js',
                    singleRun: false
                },
                'remote-unit-once': {
                    configFile: 'test/karma.remote.unit.js'
                }

            },

            requirejs: {
                compile: {
                    options: {
                        appDir: "",
                        baseUrl: "src",
                        dir: "dist",
                        name: 'main',
                        mainConfigFile: 'src/main.js',
                        optimize: "uglify2",
                        optimizeCss: 'none',
                        generateSourceMaps: true,
                        preserveLicenseComments: false,
                        skipDirOptimize: true,
                        fileExclusionRegExp: /^\.|sass/,
                        removeCombined: true,
                        useStrict: false
                    }
                }
            },


            watch: {
                options: {
                    livereload: true
                },
                html_and_scripts: {
                    files: ['./src/**', '!./src/js/lib/**', './src/*.html']
                }
            },

            yuidoc: {
                compile: {
                    name: '<%= pkg.name %>',
                    description: '<%= pkg.description %>',
                    version: '<%= pkg.version %>',
                    options: {
                        ignorePaths: './src/lib',
                        paths: './src',
                        outdir: './doc'
                    }
                }
            }

        }
    )
    ;

// Load NPM Tasks
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');


// Default Task
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('test', ['karma:local-unit-watch']);

// Testing Task
    grunt.registerTask('test:local', ['karma:local-unit-once']);
    grunt.registerTask('test:remote', ['karma:remote-unit-once']);

// Documentation Task
    grunt.registerTask('doc', ['yuidoc']);

// Release Task
    grunt.registerTask('deploy', []);


};
