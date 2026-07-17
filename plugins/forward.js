const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward message without forwarded tag (New Logic)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo?.quotedMessage) {
            return reply("❌ Reply to a message you want to forward!");
        }

        if (!q || !q.trim()) {
            return reply("❌ Please provide target JID!\nExample: .forward 94771234567@s.whatsapp.net");
        }

        const targetJid = q.trim();
        if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.endsWith('@g.us')) {
            return reply("❌ Invalid JID!");
        }

        // New Logic: Copy and send the quoted message
        const quotedMsg = contextInfo.quotedMessage;
        const msgType = Object.keys(quotedMsg)[0];

        // Remove contextInfo to remove forwarded tag
        if (quotedMsg[msgType]?.contextInfo) {
            delete quotedMsg[msgType].contextInfo;
        }

        // Send the copied message
        await conn.sendMessage(targetJid, quotedMsg);

        await reply(`✅ *Successfully forwarded to:*\n${targetJid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Failed to forward: ${e.message}`);
    }
});
