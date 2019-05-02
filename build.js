var fs = require("fs");
var browserify = require("browserify");
var babelify = require("babelify");
var UglifyJS = require("uglify-js");

var outputFilePath = "./dist/pubnub-js-webrtc.js";
var outputMinifiedFilePath = "./dist/pubnub-js-webrtc.min.js";

browserify({
        debug: false
    }).transform(babelify)
    .require("./src/pubnub-js-webrtc.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.error("Error: " + err.message); })
    .pipe(fs.createWriteStream(outputFilePath))
    .on("finish", minify);

function minify() {
    fs.writeFileSync(outputMinifiedFilePath, UglifyJS.minify({
        [outputFilePath]: fs.readFileSync(outputFilePath, "utf8")
    }).code, "utf8");
}