var concat = require('gulp-concat-util');

gulp.task('scripts', function()
{
  gulp.src(
    [
      './lib/file3.js',
      './lib/file1.js',
      './lib/file2.js'
    ])
    .pipe(concat.scripts('all.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
});
