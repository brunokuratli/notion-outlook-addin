const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Office Add-in dev certificates
const certPath = path.join(require('os').homedir(), '.office-addin-dev-certs');

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
        server: {
            type: 'https',
            options: {
                key: fs.readFileSync(path.join(certPath, 'localhost.key')),
                cert: fs.readFileSync(path.join(certPath, 'localhost.crt')),
                ca: fs.readFileSync(path.join(certPath, 'ca.crt'))
            }
        },
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
