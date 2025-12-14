import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ImageMinimizerPlugin from 'image-minimizer-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

export default {
    entry: {
        main: './src/index.ts',
        sw: './src/serviceWorker/sw.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: (pathData) => {
            if (pathData.chunk && pathData.chunk.name === 'sw') {
                return 'sw.js';
            }
            return '[name].bundle.js';
        },
        clean: true,
        publicPath: '/',
    },
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'source-map',
    devServer: {
        static: path.join(__dirname, 'public'),
        historyApiFallback: true,
        port: 8080,
        open: true
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'babel-loader',
                },
                exclude: /node_modules/
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: ['@babel/preset-env'] }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                        }
                    },
                    'sass-loader'
                ],
            },
            {
                test: /\.css$/,
                use: [isProd ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader'],
            },
            {
                test: /\.hbs$/,
                use: 'handlebars-loader'
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: 'asset',
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.hbs'],
        alias: {
            '@app': path.resolve(__dirname, 'src/app'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@entities': path.resolve(__dirname, 'src/entities'),
            '@infra': path.resolve(__dirname, 'src/infra'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@types': path.resolve(__dirname, 'src/types'),
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html',
            chunks: ['main'],
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'public'),
                    globOptions: {
                        ignore: ['**/index.html'],
                    },
                },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: isProd ? '[name].[contenthash].css' : '[name].css',
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
        ...(isProd
            ? [
                  new ImageMinimizerPlugin({
                      minimizer: {
                          implementation: ImageMinimizerPlugin.imageminMinify,
                          options: {
                              plugins: [
                                  ['gifsicle', { interlaced: true }],
                                  ['mozjpeg', { quality: 75 }],
                                  ['pngquant', { quality: [0.65, 0.8], speed: 3 }],
                                  ['svgo', { plugins: [{ name: 'removeViewBox', active: false }] }],
                              ],
                          },
                      },
                  }),
              ]
            : []),
    ],
    optimization: {
        minimize: isProd,
        minimizer: [
            '...',
            new CssMinimizerPlugin(),
        ],
    },
};
