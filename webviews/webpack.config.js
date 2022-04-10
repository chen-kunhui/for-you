const path = require('path');
const fs = require("fs");
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const root = path.resolve(__dirname, '..');

module.exports = (env = {}) => ({
    mode: env.prod ? 'production' : 'development',
    devtool: env.prod ? 'source-map' : 'eval-cheap-module-source-map',
    context: __dirname,
    entry: function() {
        let dir = path.join(__dirname, 'entry');
        let arr = fs.readdirSync(dir);
        let entries = {};
        for (const item of arr) {
            let fullpath = path.join(dir, item);
            let stats = fs.statSync(fullpath);
            if (stats.isDirectory()) {
                continue;
            } else if (item === 'init.js') {
                continue;
            } else {
                entries[path.parse(item).name] = fullpath;
            }
        }
        return entries;
    },
    output: {
        path: path.resolve(root, './dist/webviews'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.js', '.ts', '.css', '.vue', 'scss']
    },
    module: {
        rules: [{
                test: /\.vue$/,
                use: 'vue-loader'
            },
            {
                test: /\.(ttf|eot|svg|woff|woff2)$/,
                use: 'url-loader'
            },
            {
                test: /\.(png|jpg)$/,
                use: {
                    loader: 'url-loader',
                    options: { limit: 8192 }
                }
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    // Translates CSS into CommonJS
                    "css-loader",
                    // Compiles Sass to CSS
                    "sass-loader",
                ],
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name].css'
        })
    ]
})