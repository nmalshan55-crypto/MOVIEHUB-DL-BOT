const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "music"],
    desc: "Download YouTube songs (Vajira API)",
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

        // Vajira API
        const API_URL = "https://vajiraofc-apis.vercel.app/api/ytmp3";
        const API_KEY = "kumaradissanayaka30@gmail.com:vajira-12557";

        const apiResponse = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                url: videoUrl,
                quality: 128
            }
        });

        const data = apiResponse.data;

        // Adjust according to actual API response structure
        if (!data || data.status === false) {
            return reply('❌ Failed to get download link. Please try another song.');
        }

        // Common response structures - adjust if needed
        const downloadLink = data.result?.download_url || data.download_url || data.url;
        const title = data.result?.title || data.title || videoTitle;

        if (!downloadLink) {
            return reply('❌ Could not extract download link from API response.');
        }

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
        reply(`❌ Error: ${e.message || "Download failed"}\n\nPlease try another song.`);
    }
});
