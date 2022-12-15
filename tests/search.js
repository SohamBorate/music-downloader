const MusicDownloader = require("../lib/index.js");
let credentials = require("./_credentials_.json");
let downloader = new MusicDownloader(credentials, __dirname);

downloader.then((object) => {
    downloader = object;
    let download = downloader.downloadFromSearch("Teenagers My Chemical Romance")
    .then((data) => {
       console.log(data);
    }, (err) => {
        console.error(err);
    });
}, (err) => console.error(err));