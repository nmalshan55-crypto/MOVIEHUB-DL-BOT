const {cmd , commands} = require('../command')
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");

module.exports = {
    name: "song",
    command: ["song", "play"],
    description: "Download YouTube audio",

    async execute({ sock, m, args }) {
        if (!args.length) {
            return sock.sendMessage(m.key.remoteJid, {
                text: "Example:\n.song Faded Alan Walker"
            }, { quoted: m });
        }

        const query = args.join(" ");

        try {
            const search = await yts(query);

            if (!search.videos.length) {
                return sock.sendMessage(m.key.remoteJid, {
                    text: "No results found."
                }, { quoted: m });
            }

            const video = search.videos[0];

            await sock.sendMessage(m.key.remoteJid, {
                text: `🎵 *${video.title}*\n⏱ ${video.timestamp}\n👀 ${video.views}\n\nDownloading...`
            }, { quoted: m });

            const file = `./temp/${Date.now()}.mp3`;

            await ytdl(video.url, {
                extractAudio: true,
                audioFormat: "mp3",
                output: file
            });

            await sock.sendMessage(
                m.key.remoteJid,
                {
                    audio: fs.readFileSync(file),
                    mimetype: "audio/mpeg",
                    fileName: `${video.title}.mp3`
                },
                { quoted: m }
            );

            fs.unlinkSync(file);

        } catch (err) {
            console.log(err);

            sock.sendMessage(m.key.remoteJid, {
                text: "Failed to download the song."
            }, { quoted: m });
        }
    }
};
