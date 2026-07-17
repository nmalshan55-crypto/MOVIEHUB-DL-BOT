const { cmd, commands } = require('../command'); // ඔයාගේ බොට් එකේ command require කරන විදිහට මේක වෙනස් කරගන්න
const axios = require('axios');

const BASE_URL = 'https://nntech-free-xnxx-api.vercel.app';

// ================= 1. XNXX SEARCH COMMAND =================
cmd({
    pattern: "xnxx",
    desc: "Search videos from XNXX",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply("❌ කරුණාකර සර්ච් කරන්න අවශ්‍ය වචනයක් ඇතුළත් කරන්න!\n*Example:* .xnxx new");

        await reply("🔍 Searching your video... Please wait...");

        const response = await axios.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
        const data = response.data;

        if (data.status && data.result && data.result.length > 0) {
            let msg = `✨ *XNXX SEARCH RESULTS* ✨\n\n*Query:* ${q}\n\n`;
            
            data.result.forEach((video, index) => {
                msg += `*${index + 1}.* ${video.title}\n`;
                msg += `🔗 *Link:* ${video.url}\n\n`;
            });

            msg += `💡 *Download කරන්න:* ඉහත ලින්ක් එකක් Copy කරගෙන \n.xnxxdl <link> ලෙස Command එක ලබාදෙන්න.`;
            
            return await conn.sendMessage(from, { text: msg }, { quoted: mek });
        } else {
            return reply("❌ කිසිදු ප්‍රතිඵලයක් හමු වූයේ නැත.");
        }

    } catch (e) {
        console.log(e);
        reply("⚠️ API එකේ ගැටලුවක් හෝ දෝෂයක් සිදුවී ඇත!");
    }
});

// ================= 2. XNXX DOWNLOAD COMMAND =================
cmd({
    pattern: "xnxxdl",
    desc: "Download videos from XNXX link",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply("❌ කරුණාකර වීඩියෝ ලින්ක් එක ලබාදෙන්න!\n*Example:* .xnxxdl https://www.xnxx.com/video-xxxx...");

        await reply("📥 Fetching download link... Please wait...");

        const response = await axios.get(`${BASE_URL}/api/download?url=${encodeURIComponent(q)}`);
        const data = response.data;

        // API Response එක අනුව මෙතනින් Direct Download Link එක ගන්නවා
        // (සටහන: API එකෙන් දෙන JSON එකේ ඩවුන්ලෝඩ් ලින්ක් එක තියෙන variable name එක 'result' හෝ 'dl_link' විය හැක. 
        // සාමාන්‍යයෙන් data.result හෝ data.result.download ලෙස පවතී)
        if (data.status && data.result) {
            let dlUrl = typeof data.result === 'string' ? data.result : data.result.url || data.result.download;

            if (!dlUrl) return reply("❌ ඩවුන්ලෝඩ් ලින්ක් එක සොයා ගැනීමට නොහැකි විය.");

            // වීඩියෝ එක කෙලින්ම WhatsApp එකට Document එකක් හෝ Video එකක් විදිහට යැවීම
            await conn.sendMessage(from, { 
                video: { url: dlUrl }, 
                caption: "✅ Downloaded Successfully!",
                mimetype: 'video/mp4' 
            }, { quoted: mek });

        } else {
            return reply("❌ වීඩියෝව ඩවුන්ලෝඩ් කිරීමට නොහැකි විය. ලින්ක් එක නිවැරදිදැයි පරීක්ෂා කරන්න.");
        }

    } catch (e) {
        console.log(e);
        reply("⚠️ වීඩියෝව ලබාගැනීමේදී දෝෂයක් සිදුවුණා!");
    }
});
