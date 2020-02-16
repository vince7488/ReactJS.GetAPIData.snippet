const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CleanCSSPlugin = require('less-plugin-clean-css')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  watch: true,
  mode: "development",

  entry: "./src/index.js",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },

      {
        test: /\.less$/,
        use: [
          {
            loader: "style-loader"
          },
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader"
          },
          {
            loader: "less-loader",
            options: {
              strictMath: true,
              noIeCompat: false
            }
          }
        ]
      },

      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader"
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: function() {
                return [require("autoprefixer"), require("cssnano")];
              }
            }
          }
        ]
      },

      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: [
          {
            loader: "file-loader?name=./img/[name].[ext]"
          }
        ]
      },

      {
        test: /\.(ico|icon?)$/,
        use: [
          {
            loader: "file-loader?name=./[name].[ext]"
          }
        ]
      },

      {
        test: /\.(woff|woff2|ttf|otf|eot)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "fonts"
            }
          }
        ]
      }
    ] //rules
  }, //module

  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        cache: false,
        parallel: true,
        sourceMap: false,
        terserOptions: {
          ecma: undefined,
          warnings: false,
          parse: {},
          compress: {},
          mangle: false, // Note `mangle.properties` is `false` by default.
          module: false,
          output: null,
          toplevel: false,
          nameCache: null,
          ie8: false,
          keep_classnames: true,
          keep_fnames: false,
          safari10: false
        }
      })
    ]
  }, //optimization

  plugins: [
    new CleanWebpackPlugin(),

    new MiniCssExtractPlugin({
      path: path.resolve(__dirname, "dist/css"),
      filename: "./css/bundle.css"
    }),

    new HtmlWebpackPlugin({
      template: "src/index.html"
    })
  ] //plugins
};
