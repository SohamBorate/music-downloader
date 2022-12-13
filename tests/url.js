const MusicDownloader = require("../lib/index.js");
let credentials = require("./_credentials_.json");
let downloader = new MusicDownloader(credentials, process.cwd());

downloader.then((object) => {
    downloader = object;
    let download = downloader.downloadFromUrl("https://open.spotify.com/track/08mG3Y1vljYA6bvDt4Wqkj?si=5e9d730f633447c4")
    .then((data) => {
       console.log(data);
    }, (err) => {
        console.error(err);
    });
}, (err) => console.error(err));