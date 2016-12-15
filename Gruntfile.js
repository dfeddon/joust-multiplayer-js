module.exports = function(grunt)
{
    grunt.initConfig(
    {
        // package.json
        pkg: grunt.file.readJSON('package.json'),

        // clean
        clean: ['../wingdom-client-dist', '../wingdom-server-dist'],

        // broserify
        browserify:
        {
            '../wingdom-client-dist/bundle.client.min.js': ['client.js']
        },
        
        // uglify
        uglify: 
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
            my_target: 
            {
                files: 
                {
                    '../wingdom-server-dist/bundle.server.min.js': ['app.js'],
                    '../wingdom-client-dist/bundle.client.min.js': ['../wingdom-client-dist/bundle.client.min.js']
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
                    // server files
                    { src: ['./package.json'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.html'], dest: '../wingdom-server-dist/' },
                    { src: ['./index.css'], dest: '../wingdom-server-dist/' },
                    { src: ['./favicon.ico'], dest: '../wingdom-server-dist/' }
                ],
            },
        },

        // aws (s3)
        //*
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
                ],
            },
        },
        //*/

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-aws-s3');

    // Default task(s).
    grunt.registerTask('default', ['clean', 'browserify', 'uglify', 'copy', 'aws_s3']);

};