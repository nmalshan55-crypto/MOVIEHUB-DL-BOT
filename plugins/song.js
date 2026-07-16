const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["ytmp3", "play", "music"],
    desc: "Download YouTube songs as MP3 (API Method)",
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

        let videoId;
        let videoTitle = q;

        // Check if user gave a direct YouTube link
        if (q.includes('youtube.com') || q.includes('youtu.be')) {
            const urlMatch = q.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (!urlMatch) return reply('❌ Invalid YouTube link!');
            videoId = urlMatch[1];
        } else {
            // Search for the song
            const searchResults = await yts(q);
            if (!searchResults.videos.length) {
                return reply('❌ No results found. Try another song name.');
            }

            const video = searchResults.videos[0];
            videoId = video.videoId;
            videoTitle = video.title;
        }

        await conn.sendMessage(from, { react: { text: '⬇️', key: mek.key } });

        // Use free API to get MP3 download link
        const apiUrl = `https://api.vevioz.com/api/button/mp3/${videoId}`;
        
        let downloadLink;
        try {
            const apiResponse = await axios.get(apiUrl);
            const html = apiResponse.data;

            // Extract download link from the API response
            const linkMatch = html.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/);
            if (!linkMatch) {
                throw new Error('Could not extract download link');
            }
            downloadLink = linkMatch[1];
        } catch (apiError) {
            console.error('API Error:', apiError.message);
            return reply('❌ Failed to get download link. Please try again later or use another song.');
        }

        // Send the audio file
        await conn.sendMessage(from, {
            audio: { url: downloadLink },
            mimetype: 'audio/mpeg',
            fileName: `${videoTitle}.mp3`,
            caption: `🎵 *${videoTitle}*\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('Song command error:', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ Error: ${e.message || "Something went wrong"}\n\nPlease try another song.`);
    }
});
