# music-dwnldr
A module to download music.

## Usage

Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
and create an app.

Copy the `Client ID` and the `Client Secret`.

```js
const MusicDownloader = require("music-dwnldr");

let credentials = require({
    "clientId": "<Client ID>",
    "clientSecret": "<Client Secret>"
});
let downloader = new MusicDownloader(credentials, __dirname);

downloader.then((object) => {
    downloader = object;
    let download = downloader.downloadFromUrl("https://open.spotify.com/track/08mG3Y1vljYA6bvDt4Wqkj?si=5e9d730f633447c4")
    .then((data) => {
       console.log(data);
    }, (err) => {
        console.error(err);
    });
}, (err) => console.error(err));
```

## Downloading using search query

```js
const MusicDownloader = require("music-dwnldr");

let credentials = require({
    "clientId": "<Client ID>",
    "clientSecret": "<Client Secret>"
});
let downloader = new MusicDownloader(credentials, __dirname);

downloader.then((object) => {
    downloader = object;
    let download = downloader.downloadFromSearch({
        "track": "Teenagers",
        "artist": "My Chemical Romance"
    })
    .then((data) => {
       console.log(data);
    }, (err) => {
        console.error(err);
    });
}, (err) => console.error(err));
```