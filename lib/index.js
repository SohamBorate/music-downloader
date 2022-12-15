const fs = require("fs");
const https = require("https");
const Stream = require("stream").Transform;
const SpotifyWebApi = require("spotify-web-api-node");
const Youtube = require("youtube-sr").default;
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ID3Writer = require("browser-id3-writer");

const deleteForbidDirChars = require("./deleteForbidChar")

// Downloader
class MusicDownloader {
    constructor(creds, workingDir) {
        return new Promise((resolve, reject) => {
            if (!creds) reject(`Credentials not provided`);
            if (!workingDir) reject(`Working directory not provided`);
            this.creds = creds;
            this.workingDir = workingDir;
            this.spotify = new SpotifyWebApi(creds);
            this.spotify.clientCredentialsGrant().then((data) => {
                this.spotify.setAccessToken(data.body.access_token);
                if (!fs.existsSync(`${workingDir}/.music-dwnldr`)) fs.mkdirSync(`${workingDir}/.music-dwnldr`)
                resolve(this);
            }, (err) => {
                reject(`Error retrieving access token: ${err.message}`);
            });
        });
    }

    download = (options) => {
        return this.downloadOptions[options.type](options.value);
    }

    downloadOptions = {
        "url": (url) => {
            return this.downloadFromUrl(url);
        },
        "search": (query) => {
            return this.downloadFromSearch(query);
        }
    }

    downloadFromSearch = (query) => {
        return new Promise((resolve, reject) => {
            this.spotify.searchTracks(query)
            .then((spotSearchData) => {
                // sort by popularity
                spotSearchData.body.tracks.items.sort(function(a, b){return b.popularity - a.popularity});
                let track = spotSearchData.body.tracks.items[0];
                // download from url
                this.downloadFromUrl(track.external_urls.spotify, track)
                .then((data) => {
                    resolve(data);
                }, (err) => {
                    reject(err);
                });
            }, (err) => {
                reject(`Error downloading ${query}: ${err}`)
            });
        });
    }

    downloadFromUrl = (url, data) => {
        return new Promise((resolve, reject) => {
            if (url.split('/')[3] !== "track") {
                reject(`Error downloading ${url}: only download tracks!`);
            }

            let install = () => {
                let query = {
                    "track": data.name,
                    "artist": data.artists[0].name
                }
                let fileName = deleteForbidDirChars(`${query.track} - ${query.artist}`);
                let imageName = deleteForbidDirChars(`${data.album.name} - ${query.artist}`);
                // begin download from YouTube
                this.downloadFromYoutube(`${query.track} by ${query.artist}`)
                .then((audio) => {
                    // convert audio
                    this.convertAudio(audio, `${this.workingDir}/${fileName}.mp3`)
                    .then(() => {
                        // download thumbnail
                        this.downloadImage(data.album.images[0].url, `${this.workingDir}/.music-dwnldr/${imageName}.jpg`)
                        .then(() => {
                            metadata(query);
                        }, (err) => {
                            metadata(query);
                            console.log(err);
                        });
                    }, (err) => {
                        reject(`Error downloading ${query.track} by ${query.artist}: ${err}`);
                    });
                }, (err) => {
                    reject(err);
                });
            }

            // apply metadata
            let metadata = (query) => {
                let fileName = deleteForbidDirChars(`${query.track} - ${query.artist}`);
                this.applyMetadata({
                    data: data,
                    filePath: `${this.workingDir}/${fileName}.mp3`,
                    imagePath: `${this.workingDir}/.music-dwnldr/${fileName}.jpg`
                })
                .then(() => {
                    resolve(`Downloaded ${query.track} by ${query.artist}`);
                }, (err) => {
                    reject(err);
                });
            }

            if (!data) {
                // get info
                let id = url.split('/')[4];
                this.spotify.getTrack(id).then((trackData) => {
                    data = trackData.body;
                    install();
                }, (err) => {
                    reject(`Error downloading ${url}: ${err}`);
                });
            } else install();
        });
    }

    downloadFromYoutube = (query) => {
        return new Promise((resolve, reject) => {
            let ytSearch = Youtube.searchOne(query);
            ytSearch.then((ytSearchData) => {
                let audio = ytdl(ytSearchData.url, { filter: "audioonly", quality: "highestaudio" });
                resolve(audio);
            }, (err) => {
                reject(`Error downloading from YouTube ${query}: ${err}`);
            });
        });
    }

    convertAudio = (audio, path) => {
        return new Promise((resolve, reject) => {
            ffmpeg(audio)
            .toFormat("mp3")
            .audioBitrate(5000)
            .on("error", (err) => {
                reject(`Error converting ${path}: ${err}`);
            })
            .on("end", () => {
                resolve();
            })
            .save(path);
        });
    }

    applyMetadata = (options) => {
        return new Promise((resolve, reject) => {
            let data = options.data;
            let filePath = options.filePath;
            let imagePath = options.imagePath;
            let rawFile = fs.readFileSync(filePath);
            let artists = data.artists;
            let release = data.album.release_date.split("-");
            // create track metadata
            let metadata = {
                TPE1: [],
                TIT2: data.name,
                TALB: data.album.name,
                TPE2: data.album.artists[0].name,
                TRCK: data.track_number,
                TPOS: data.disc_number,
                WOAF: data.external_urls.spotify,
                WOAR: artists[0].external_urls.spotify,
                WOAS: data.external_urls.spotify,
                TLEN: data.duration_ms,
                TDAT: `${release[1]}${release[2]}`,
                TYER: release[0],
    
            };
            // thumbnail only if image path specified
            if (fs.existsSync(imagePath)) {
                metadata.APIC = {
                    type: 3,
                    data: fs.readFileSync(imagePath),
                    description: "thumbnail"
                }
            }
            // add contributing artists
            for (let i = 0; i < artists.length; i++) {
                metadata.TPE1.push(artists[i].name);
            }
            // write track metadata
            let writer = new ID3Writer(rawFile);
            for (let tag in metadata) {
                writer.setFrame(tag, metadata[tag]);
            }
            writer.addTag();
            let taggedSongBuffer = Buffer.from(writer.arrayBuffer);
            fs.writeFile(filePath, taggedSongBuffer, {flag: "w"}, (err) => {
                if (err) {
                    reject(`Error apply metadata ${filePath}: ${err}`);
                } else {
                    resolve();
                }
            });
        });
    }

    downloadImage = (url, path) => {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(path)) {
                resolve();
            }
            try {
                https.request(url, function(response) {
                    let data = new Stream();
                    response.on("data", function(chunk) {
                        data.push(chunk);
                    });
                    response.on("end", function() {
                        fs.writeFileSync(path, data.read());
                        resolve();
                    });
                }).end();
            } catch (err) {
                reject(`Error downloading image ${path}: ${err}`);
            }
        });
    }
}

module.exports = MusicDownloader;