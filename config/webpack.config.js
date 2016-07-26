var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  context: __dirname + '/../src/js',

  entry: {
    factual_background: './factual_background.js',
    factual_client: './factual_client.js',
    factual_reload: './factual_reload.js',
    factual_common: [
      'lodash',
      'jquery',
      'async',
      'bluebird',
    ],
  },

  output: {
    path: path.resolve(__dirname, '../build'),
    pathinfo: true,
    filename: '[name].js',
    sourceMapFilename: '[name].map',
  },

  module: {
    loaders: [
      {
        test: require.resolve('trackjs'),
        loader: 'exports?trackJs',
      },
      {
        // exclude: /node_modules/,
        include: path.join(__dirname, '../src'),
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          compact: false,
          presets: ['es2015', 'react', 'stage-0'],
        },
      },
      {
        // exclude: /node_modules/,
        include: path.join(__dirname, '../src'),
        loader: 'babel-loader',
        test: /\.jsx?$/,
        query: {
          compact: false,
          presets: ['es2015', 'react', 'stage-0'],
        },
      },
      {
        test: /\.css$/,
        loader: 'style!css',
      },
      {
        test: /\.scss/,
        loader: ExtractTextPlugin.extract('css!sass'),
      },
      {
        test: /\.tpl$/,
        loader: 'raw',
      },
      {
        test: /\.html$/,
        loader: 'raw',
      },
      {
        test: /\.png$/,
        loader: 'url?limit=10000&name=assets/[name].[ext]',
      },
    ],
  },

  resolve: {
    extensions: ['', '.js', '.jsx', '.json'],
    modulesDirectories: [
      '../node_modules',
    ],
    alias: {
      'mutation-summary': path.resolve(__dirname, '../node_modules/mutation-summary/src/mutation-summary'),
    },
  },

  plugins: [
    new webpack.ProvidePlugin({
      _: 'lodash',
      $: 'jquery',
      jQuery: 'jquery',
      async: 'async',
      Promise: 'bluebird',
    }),
    new webpack.optimize.CommonsChunkPlugin('factual_common', 'factual_common.js'),
    new ExtractTextPlugin('css/factual.css', { allChunks: true }),
  ],
};
