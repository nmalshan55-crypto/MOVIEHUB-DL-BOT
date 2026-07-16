const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "music"],
    desc: "Download YouTube songs using Dark Shan YT API",
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

        // If not a direct link, search first
        if (!q.includes('youtube.com') && !q.includes('youtu.be')) {
            const search = await yts(q);
            if (!search.videos.length) {
                return reply('❌ No results found for your query!');
            }
            videoUrl = search.videos[0].url;
            videoTitle = search.videos[0].title;
        }

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Your Custom API
        const API_URL = "https://api-dark-shan-yt.koyeb.app/download/ytmp3";
        const API_KEY = "0f32d99d8c139689";

        const apiResponse = await axios.get(API_URL, {
            params: {
                url: videoUrl,
                api_key: API_KEY
            }
        });

        const data = apiResponse.data;

        if (!data || !data.status || !data.download_url) {
            return reply('❌ Failed to get download link from API. Please try again.');
        }

        const downloadLink = data.download_url;
        const title = data.title || videoTitle;

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: downloadLink },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            caption: `🎵 *${title}*\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Song API Error:', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message || "Something went wrong"}\n\nPlease try another song.`);
    }
});
