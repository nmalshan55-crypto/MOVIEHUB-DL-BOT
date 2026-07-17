const { cmd, commands } = require('../command');
const axios = require('axios');

cmd({
    pattern: "fitgirl",
    alias: ["fg", "game"],
    desc: "Search games from Fitgirl Repacks.",
    category: "search",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, reply }) => {
    try {
        if (!q) {
            return reply("❌ කරුණාකර සෙවිය යුතු Game එකේ නම ඇතුළත් කරන්න!\n\n*Example:* .fitgirl GTA");
        }

        await conn.sendMessage(from, { react: { text: '🔍', key: m.key } });

        const apiUrl = `https://api-build.vercel.app/api/fitgirl?q=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);
        const resData = response.data;

        if (resData.status === true && resData.data && resData.data.results && resData.data.results.length > 0) {
            
            let replyText = `🎮 *FITGIRL GAME SEARCH* 🎮\n\n`;
            replyText += `📝 *Search Query:* ${resData.data.query}\n`;
            replyText += `📊 *Total Found:* ${resData.data.total_results}\n`;
            replyText += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            const limitedResults = resData.data.results.slice(0, 6);

            limitedResults.forEach((game, index) => {
                replyText += `*${index + 1}. ${game.title}*\n`;
                replyText += `🔗 *Link:* ${game.url}\n\n`;
                replyText += `───────────────────\n\n`;
            });

            replyText += `👨‍💻 *Powered By:* Akash\n`;
            replyText += `⚡ *SL Movie Hub & Bot Services*`;

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            return await reply(replyText);

        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`🔍 Sorry, "${q}" නමින් කිසිදු Game එකක් සොයාගත නොහැකි වුණා.`);
        }

    } catch (error) {
        console.error("Fitgirl API Error:", error);
        await conn.sendMessage(from, { react: { text: '⚠️', key: m.key } });
        return reply("⚠️ API එක සම්බන්ධ කරගැනීමේදී දෝෂයක් සිදු වුණා. පසුව නැවත උත්සාහ කරන්න.");
    }
});
