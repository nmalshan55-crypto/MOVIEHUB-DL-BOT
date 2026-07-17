const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

cmd({
    pattern: "forward",
    alias: ["fo"],
    react: "💯",
    desc: "Forward message without tag (Low memory version)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a message!");
        if (!q?.trim()) return reply("❌ Provide JID!");

        const targetJid = q.trim();

        // Direct copy method (most efficient)
        const message = { ...quotedMessage };

        // Remove forwarded tag if exists
        if (message.extendedTextMessage) {
            delete message.extendedTextMessage.contextInfo;
        }
        if (message.documentMessage) {
            delete message.documentMessage.contextInfo;
        }
        if (message.videoMessage) {
            delete message.videoMessage.contextInfo;
        }
        if (message.audioMessage) {
            delete message.audioMessage.contextInfo;
        }
        if (message.imageMessage) {
            delete message.imageMessage.contextInfo;
        }

        await conn.sendMessage(targetJid, message);

        reply(`✅ Forwarded to ${targetJid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
