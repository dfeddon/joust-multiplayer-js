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
            my_target_client:
            {
                options:
                {
                    compress:false,
                    /*compress: 
                    {
                        drop_console: false
                },*/
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
                    // client files
                    { src: ['./bundle.client.min.js'], dest: './dist/client/'},
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
    grunt.registerTask('default', ['clean', 'browserify', 'uglify', 'copy', 'aws_s3']);//, 'grunt_git']);

};