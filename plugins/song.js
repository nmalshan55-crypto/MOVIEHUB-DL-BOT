const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "music"],
    desc: "Download YouTube songs as MP3",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply(`❌ Please provide a song name or YouTube link!\n\n*Example:*\n.song shape of you\n.song https://youtu.be/abc123`);

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoUrl = q;

        // If not a YouTube link, search for it
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            if (!search.videos.length) return reply('❌ No results found for your query!');

            const video = search.videos[0];
            videoUrl = video.url;
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(videoUrl)) {
            return reply('❌ Invalid YouTube URL!');
        }

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Get video info
        const info = await ytdl.getInfo(videoUrl);
        const title = info.videoDetails.title;
        const duration = info.videoDetails.lengthSeconds;

        // Get audio format (best quality)
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        if (!audioFormats.length) return reply('❌ No audio format available!');

        const audioUrl = audioFormats[0].url;

        // Send as audio
        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            caption: `🎵 *${title}*\n⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message || "Failed to download song"}\n\nTry another song or link.`);
    }
});
