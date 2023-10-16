
const path = require("path");

const config = {
    mode: "development",
    entry: "./index.ts",
    devtool: false,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            // do not specify a `name` here
            type: 'module',
        },
    },
    experiments: {
        outputModule: true,
    }
};

module.exports = config;