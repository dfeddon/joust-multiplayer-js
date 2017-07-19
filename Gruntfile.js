module.exports = function(grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.initConfig({
        // package.json
        pkg: grunt.file.readJSON('package.json'),

        // grunt watch
        watch: {
            scripts: {
                files: ['*.js', '!bundle.client.min.js', '!leaderboards.min.js'],
                tasks: ['browserify'],
            }
        },

        // clean
        clean: ['../wingdom-server-dist/*', '!../wingdom-server-dist/.git'],

        // broserify
        browserify: {
            'bundle.client.min.js': ['client.js'],
            'leaderboards.min.js': ['leaderboards.js']
        },

        // uglify client
        uglify: {
            // my_target_server:
            // {
            //     options:
            //     {
            //         compress: 
            //         {
            //             drop_console: true
            //         },
            //         mangle: false,
            //         beautify: false
            //     },
            //     files: 
            //     {
            //         'bundle.server.min.js': [
            //             'app.js',
            //             'game.server.js',
            //             'game.core.js',
            //             'class.globals.js',
            //             'singleton.assets.js',
            //             'class.getplayers.js',
            //             'egyptian_set.js',
            //             'class.player.js',
            //             'class.flag.js',
            //             'class.platform.js',
            //             'class.event.js',
            //             'class.consumable.js',
            //             'class.toast.js'
            //         ]
            //     }
            // },
            dist: {
                options: {
                    compress: {
                        drop_console: true
                    },
                    mangle: true,
                    beautify: false,
                    output: {
                        comments: false
                    }
                },
                files: {
                    'bundle.client.min.js': ['bundle.client.min.js'],
                    'leaderboards.min.js': ['leaderboards.min.js'],
                    '../wingdom-server-dist/app.js': ['app.js'],
                    '../wingdom-server-dist/game.connections.js': ['game.connections.js'],
                    '../wingdom-server-dist/game.server.js': ['game.server.js'],
                    '../wingdom-server-dist/game.core.js': ['game.core.js'],
                    '../wingdom-server-dist/core.client.js': ['core.client.js'],
                    '../wingdom-server-dist/core.server.js': ['core.server.js'],
                    '../wingdom-server-dist/class.globals.js': ['class.globals.js'],
                    '../wingdom-server-dist/class.round.js': ['class.round.js'],
                    '../wingdom-server-dist/class.buffs.js': ['class.buffs.js'],
                    '../wingdom-server-dist/singleton.assets.js': ['singleton.assets.js'],
                    '../wingdom-server-dist/class.getplayers.js': ['class.getplayers.js'],
                    '../wingdom-server-dist/class.player.js': ['class.player.js'],
                    '../wingdom-server-dist/class.flag.js': ['class.flag.js'],
                    '../wingdom-server-dist/class.platform.js': ['class.platform.js'],
                    '../wingdom-server-dist/class.event.js': ['class.event.js'],
                    '../wingdom-server-dist/class.consumable.js': ['class.consumable.js'],
                    '../wingdom-server-dist/class.toast.js': ['class.toast.js'],
                    '../wingdom-server-dist/class.spritesheet.js': ['class.spritesheet.js'],
                    '../wingdom-server-dist/class.particles.js': ['class.particles.js'],
                    '../wingdom-server-dist/class.emitter.js': ['class.emitter.js'],
                    '../wingdom-server-dist/class.particle.js': ['class.particle.js'],
                    '../wingdom-server-dist/class.particleShrink.js': ['class.particleShrink.js'],
                }
            },
            dev: {
                options: {
                    compress: false,
                    mangle: false,
                    beautify: true
                },
                files: {
                    'bundle.client.min.js': ['bundle.client.min.js'],
                    'leaderboards.min.js': ['leaderboards.min.js']
                }
            }
        },

        // copy
        copy: {
            main: {
                files: [
                    // client files (files uploaded to S3)
                    { src: ['./bundle.client.min.js'], dest: './dist/client/' },
                    { src: ['./leaderboards.min.js'], dest: './dist/client/' },
                    // { src: ['./assets/tilesets/skin1-tileset.png'], dest: './dist/client/'},
                    { src: ['./assets/tilemaps/joust-alpha-1.tmx'], dest: './dist/client/' },
                    // server files
                    // { src: ['./bundle.server.min.js'], dest: '../wingdom-server-dist/'},
                    { src: ['./package.json'], dest: '../wingdom-server-dist/' },
                    // { src: ['./.ebextensions/proxy.config'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.css'], dest: '../wingdom-server-dist/' },
                    { src: ['./primus.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./primus.js'], dest: '../wingdom-server-dist/primus/' },
                    { src: ['./privacy.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./terms.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./headlines.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./howtoplay.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./leaderboards.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./sitemap.xml'], dest: '../wingdom-server-dist/' },
                    { src: ['./manifest.json'], dest: '../wingdom-server-dist/' },
                    { src: ['./favicon.ico'], dest: '../wingdom-server-dist/' },
                    { src: ['./egyptian_set.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/tilemaps/joust-alpha-1.tmx'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/apple-touch-icon-114x114.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/apple-touch-icon-72x72.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/apple-touch-icon-57x57.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/launcher-icon-4x.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/launcher-icon-3x.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/launcher-icon-2x.png'], dest: '../wingdom-server-dist/' },
                    { src: ['./lib/keyboard.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./lib/pxloader-images.min.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./lib/aws-sdk-2.72.0.min.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./robots.txt'], dest: '../wingdom-server-dist/' },
                    { expand: true, src: ['./theme/*'], dest: '../wingdom-server-dist/', filter: 'isFile' },
                    { expand: true, src: ['./bootstrap/*'], dest: '../wingdom-server-dist/', filter: 'isFile' },
                ],
            },
        },

        // aws (s3)
        aws: grunt.file.readJSON('aws-keys.json'),
        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>',
                secretAccessKey: '<%= aws.AWSSecretKey %>'
            },
            dist: {
                options: {
                    bucket: 'com.dfeddon.wingdom'
                },
                files: [
                    { expand: true, cwd: 'dist/client', src: ['**'], dest: './', action: 'upload' }
                ],
            },
            // dev:
            // {
            //     options: 
            //     {
            //         bucket: 'com.dfeddon.wingdom'
            //     },
            //     files:
            //     [
            //         {expand: true, cwd: 'dist/client', src: ['**'], dest: './', action: 'upload'}
            //     ],
            // } 
        },

        // git commit
        /*
        gitcommit:
        {
            your_target:
            {
                options:
                {
                    cwd: "../wingdom-server-dist/",
                    verbose: true
                },
                files:
                [

                ]
            }
        },
        // git push
        gitpush:
        {

        }
        //*/

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-aws-s3');
    grunt.loadNpmTasks('grunt-git');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['browserify']); //, 'uglify:dev']);//, 'grunt_git']);
    grunt.registerTask('dist', ['clean', 'browserify', 'uglify:dist', 'copy', 'aws_s3']); //, 'grunt_git']);
};