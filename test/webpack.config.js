
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const config = {
    mode: "development",
    entry: "./index.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
    },
    plugins: [
        new HtmlWebpackPlugin(),
    ],
    experiments: {
        asyncWebAssembly: true,
    },
    devtool: 'source-map',
};

module.exports = () => {
    return config;
};