import gulp from 'gulp';
import gutil from 'gutil';
import webpack from 'webpack';
import gulpWebpack from 'gulp-webpack';
import eslint from 'gulp-eslint';

import runSequence from 'run-sequence';
import clean from 'gulp-clean';
import replace from 'gulp-replace';
import childProcess from 'child_process';
import mkdirp from 'mkdirp';
import bump from 'gulp-bump';
import fs from 'fs';

import config from './config/webpack.config.js';

const exec = childProcess.exec;

const getManifest = () => {
  return JSON.parse(fs.readFileSync('./build/manifest.json', 'utf8'));
};

/**
 * Clean
 * Cleans the build directory before a build.
 * Used for the build task.
 */
gulp.task('clean', () => {
  return gulp.src(['./build', './dist']).pipe(clean());
});

/**
 * ESLint
 * Checks the sourcecode for errors with ESLint. Used for the build and dev tasks.
 */
gulp.task('lint', () => {
  return gulp.src(['app/js/*.js'])
    .pipe(eslint({ useEslintrc: true }))
    .pipe(eslint.format());
});

gulp.task('pre-build', (callback) => {
  runSequence(
    'clean',
    'bump',
    'lint',
    'static',
    callback
  );
});

gulp.task('bump', () => {
  return gulp.src(['./manifest.json', './package.json'])
  .pipe(bump())
  .pipe(gulp.dest('./'));
});

gulp.task('build', ['pre-build'], (callback) => {
  const compiler = webpack(config);

  compiler.run((err, stats) => {
    if (err) {
      throw new gutil.PluginError('webpack-build', err);
    }

    gutil.log('[webpack:build-dev]', stats.toString({
      colors: true,
    }));

    const manifest = getManifest();
    const name = manifest.name + '.' + manifest.version;

    mkdirp('./dist', (mderr) => {
      if (mderr) {
        throw new gutil.PluginError('build', err);
      }

      let command = './node_modules/.bin/crx pack ./build -p ./config/factual.pem -o ./dist/';
      command += name + '.crx';

      exec(command, () => {
        callback();
      });
    });
  });
});

gulp.task('static', () => {
  gulp.src([
    'manifest.json',
    'src/**/*.png',
    'src/**/*.svg',
    'src/**/*.gif',
    'src/**/*.eot',
    'src/**/*.otf',
    'src/**/*.woff',
    'src/**/*.ttf',
    'src/**/*.woff2',
  ])
    .pipe(gulp.dest('./build'));
});

gulp.task('build-dev', [], (callback) => {
  const compiler = webpack(config);

  compiler.run((err, stats) => {
    if (err) {
      throw new gutil.PluginError('webpack-build', err);
    }

    gutil.log('[webpack:build-dev]', stats.toString({
      colors: true,
    }));

    callback();
  });
});

gulp.task('reload', () => {
  gulp.src('src/assets/reload.html')
    .pipe(replace('__TIMESTAMP__', new Date().getTime().toString()))
    .pipe(gulp.dest('./build'));
});

gulp.task('watch-static', [], (callback) => {
  runSequence(
    'static',
    'reload',
    callback
  );
});

gulp.task('watch-webpack', [], (callback) => {
  runSequence(
    'build-dev',
    'reload',
    callback
  );
});

// gulp.task('dev', ['static', 'build-dev', 'reload'], () => {
gulp.task('dev', ['static'], () => {
  const devConfig = config;
  devConfig.watch = true;

  gulp.watch(['src/*.json'], ['watch-static']);
  gulp.watch(['src/assets/*.png', 'src/assets/*.gif', 'src/assets/*.svg'], ['watch-static']);

  gutil.log('Starting webpack.');
  const compiler = webpack(config, (err, stats) => {
    if (err) {
      throw new gutil.PluginError('webpack-build', err);
    }

    gutil.log(stats.toString());

    gutil.log('Webpack is watching for changes');
  });

  compiler.compiler.plugin('done', () => {
    gutil.log('Reloading the chrome extension.');

    gulp.src('src/assets/reload.html')
      .pipe(replace('__TIMESTAMP__', new Date().getTime().toString()))
      .pipe(gulp.dest('./build'));
  });
});

gulp.task('default', ['dev']);
