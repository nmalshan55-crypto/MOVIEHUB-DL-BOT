const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

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
        if (!q) return reply(`❌ Please provide a song name or YouTube link!`);

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoId;
        let videoTitle = q;

        // If user sends a link
        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            const match = q.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (!match) return reply('❌ Invalid YouTube link!');
            videoId = match[1];
        } else {
            // Search song
            const search = await yts(q);
            if (!search.videos.length) return reply('❌ No results found!');
            videoId = search.videos[0].videoId;
            videoTitle = search.videos[0].title;
        }

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Using Cobalt API (more stable)
        const cobaltRes = await axios.post('https://api.cobalt.tools/api/json', {
            url: `https://www.youtube.com/watch?v=${videoId}`
        }, {
            headers: { 'Accept': 'application/json' }
        });

        if (!cobaltRes.data || !cobaltRes.data.url) {
            return reply('❌ Failed to get download link. Try another song.');
        }

        const downloadUrl = cobaltRes.data.url;

        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${videoTitle}.mp3`,
            caption: `🎵 *${videoTitle}*\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message || "Download failed"}\n\nPlease try again.`);
    }
});
