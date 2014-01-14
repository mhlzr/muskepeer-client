module.exports = function (grunt) {


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
                        exclude: 'lib',
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
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');


// Default Task
    grunt.registerTask('default', ['watch']);


// Documentation Task
    grunt.registerTask('doc', ['yuidoc']);

// Release Task
    grunt.registerTask('deploy', ['doc', 'requirejs']);


};
