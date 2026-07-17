const { cmd } = require('../command');

cmd({
    pattern: "hidetag",
    alias: ["htag", "stag"],
    desc: "Tag all group members without showing @ mentions",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isOwner, groupMetadata, participants, q, reply }) => {
    try {
        if (!isGroup) return reply("❌ *This command only works in groups.*");
        if (!isAdmins && !isOwner) return reply("❌ *Only group admins can use this command.*");

        const text = q && q.trim() ? q : "📢 *Attention everyone!*";
        const mentions = participants.map(p => p.id);

        await conn.sendMessage(from, {
            text: text,
            mentions: mentions
        }, { quoted: m });
    } catch (e) {
        console.error('Hidetag error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
