const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        taskpane: './src/taskpane/taskpane.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        port: 3000,
        https: true,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        allowedHosts: 'all'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/taskpane/taskpane.html',
            filename: 'taskpane.html',
            chunks: ['taskpane']
        }),
        new HtmlWebpackPlugin({
            template: './src/commands.html',
            filename: 'commands.html',
            chunks: []
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'assets',
                    to: 'assets'
                }
            ]
        })
    ],
    resolve: {
        extensions: ['.js']
    }
};
