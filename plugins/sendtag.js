const { cmd } = require('../command');

cmd({
    pattern: "sendtag",
    react: "📢",
    desc: "Tag all members in a specific group, sent from any chat",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { from, q, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("❌ *This command is owner-only.*");

        if (!q || !q.includes('&')) {
            return reply("❌ *Usage:*\n.sendtag <groupJID> & <message>\n\n*Example:*\n.sendtag 120363405404467488@g.us & Hello Everyone");
        }

        const [rawJid, ...msgParts] = q.split('&');
        const targetJid = rawJid.trim();
        const text = msgParts.join('&').trim();

        if (!targetJid.endsWith('@g.us')) {
            return reply("❌ *Target must be a valid group JID ending with @g.us*");
        }
        if (!text) {
            return reply("❌ *Please provide a message to send after the & symbol.*");
        }

        const groupMeta = await conn.groupMetadata(targetJid).catch(() => null);
        if (!groupMeta) {
            return reply("❌ *Couldn't fetch that group.* Make sure the bot is a member of it and the JID is correct.");
        }

        const mentions = groupMeta.participants.map(p => p.id);

        await conn.sendMessage(targetJid, { text, mentions }, { quoted: m });
        await reply(`✅ *Tag sent to group:* ${groupMeta.subject || targetJid}`);
    } catch (e) {
        console.error('Sendtag error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
