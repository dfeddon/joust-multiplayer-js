module.exports = function(grunt)
{
    grunt.initConfig(
    {
        // package.json
        pkg: grunt.file.readJSON('package.json'),

        // clean
        clean: ['../wingdom-server-dist/*', '!../wingdom-server-dist/.git'],

        // broserify
        browserify:
        {
            'bundle.client.min.js': ['client.js']
        },
        
        // uglify client
        uglify: 
        {
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
            //             'class.chest.js',
            //             'class.toast.js'
            //         ]
            //     }
            // },
            dist:
            {
                options:
                {
                    compress: 
                    {
                        drop_console: true
                    },
                    mangle: true,
                    beautify: false
                },
                files: 
                {
                    'bundle.client.min.js': ['bundle.client.min.js'],
                    'dist/server/app.js': ['app.js'],
                    'dist/server/game.server.js': ['gamer.server.js'],
                    'dist/server/game.core.js': ['game.core.js'],
                    'dist/server/class.globals.js': ['class.globals.js'],
                    'dist/server/singleton.assets.js': ['singleton.assets.js'],
                    'dist/server/class.getplayers.js': ['class.getplayers.js'],
                    'dist/server/class.player.js': ['class.player.js'],
                    'dist/server/class.flag.js': ['class.flag.js'],
                    'dist/server/class.platform.js': ['class.platform.js'],
                    'dist/server/class.event.js': ['class.event.js'],
                    'dist/server/class.chest.js': ['class.chest.js'],
                    'dist/server/class.toast.js': ['class.toast.js'],
                    'dist/server/class.spritesheet.js': ['class.spritesheet.js'],
                }
            },
            dev:
            {
                options:
                {
                    compress: false,
                    mangle: false,
                    beautify: true
                },
                files: 
                {
                    'bundle.client.min.js': ['bundle.client.min.js']
                }
            }
        },

        // copy
        copy:
        {
            main:
            {
                files:
                [
                    // client files (files uploaded to S3)
                    { src: ['./bundle.client.min.js'], dest: './dist/client/'},
                    { src: ['./assets/tilesets/skin1-tileset.png'], dest: './dist/client/'},
                    { src: ['./assets/tilemaps/joust-alpha-1.tmx'], dest: './dist/client/'},
                    // server files
                    // { src: ['./bundle.server.min.js'], dest: '../wingdom-server-dist/'},
                    { src: ['./package.json'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.css'], dest: '../wingdom-server-dist/' },
                    { src: ['./favicon.ico'], dest: '../wingdom-server-dist/' },
                    { src: ['./app.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./game.server.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./game.core.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.globals.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./singleton.assets.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.getplayers.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./egyptian_set.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.player.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.flag.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.platform.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.event.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.chest.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.toast.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./class.spritesheet.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./assets/tilemaps/joust-alpha-1.tmx'], dest: '../wingdom-server-dist/' },
                    { src: ['./lib/keyboard.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./lib/pxloader-images.min.js'], dest: '../wingdom-server-dist/' },
                    { src: ['./robots.txt'], dest: '../wingdom-server-dist/' },
                ],
            },
        },

        // aws (s3)
        aws: grunt.file.readJSON( 'aws-keys.json' ),
        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>',
                secretAccessKey: '<%= aws.AWSSecretKey %>'
            },
            dist: 
            {
                options: 
                {
                    bucket: 'com.dfeddon.wingdom'
                },
                files:
                [
                    {expand: true, cwd: 'dist/client', src: ['**'], dest: './', action: 'upload'}
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

    // Default task(s).
    grunt.registerTask('default', ['browserify']);//, 'uglify:dev']);//, 'grunt_git']);
    grunt.registerTask('dist', ['clean', 'browserify', 'uglify:dist', 'copy', 'aws_s3']);//, 'grunt_git']);
};