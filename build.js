var fs = require("fs");
var browserify = require("browserify");
var babelify = require("babelify");

browserify({
        debug: false
    }).transform(babelify)
    .require("./src/pubnub-js-webrtc.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.error("Error: " + err.message); })
    .pipe(fs.createWriteStream("./dist/pubnub-js-webrtc.js"));