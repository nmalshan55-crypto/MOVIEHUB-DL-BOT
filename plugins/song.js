const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "music"],
    desc: "Download YouTube songs (Free Public API)",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) {
            return reply(`❌ Please provide a song name or YouTube link!\n\n*Example:*\n.song shape of you\n.song https://youtu.be/3JZ_D3ELwOQ`);
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        let videoUrl = q;
        let videoTitle = q;

        // Search if not a direct link
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            if (!search.videos.length) {
                return reply('❌ No results found for your query!');
            }
            videoUrl = search.videos[0].url;
            videoTitle = search.videos[0].title;
        }

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Extract video ID
        const videoIdMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (!videoIdMatch) {
            return reply('❌ Invalid YouTube URL!');
        }
        const videoId = videoIdMatch[1];

        // Free Public API (no key required)
        const apiUrl = `https://ytmp3.cc/api/button/mp3/${videoId}`;

        const apiResponse = await axios.get(apiUrl);
        const html = apiResponse.data;

        // Extract download link from HTML response
        const linkMatch = html.match(/href="(https:\/\/[^"]+\/download[^"]+)"/);
        
        if (!linkMatch) {
            return reply('❌ Failed to get download link. Please try another song.');
        }

        const downloadLink = linkMatch[1];

        await conn.sendMessage(from, {
            audio: { url: downloadLink },
            mimetype: 'audio/mpeg',
            fileName: `${videoTitle}.mp3`,
            caption: `🎵 *${videoTitle}*\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Song API Error:', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message || "Download failed"}\n\nPlease try another song.`);
    }
});
