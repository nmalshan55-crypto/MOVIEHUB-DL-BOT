const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward large files (Optimized Key Reuse)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a message first!");
        if (!q || !q.trim()) return reply("❌ Provide target JID!");

        const targetJid = q.trim();
        const msgType = Object.keys(quotedMessage)[0];

        // Text
        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            await conn.sendMessage(targetJid, { text });
            return reply(`✅ Forwarded to ${targetJid}`);
        }

        // Media - Clone and clean
        let messageToSend = JSON.parse(JSON.stringify(quotedMessage));

        // Clean contextInfo to remove forwarded tag
        if (messageToSend[msgType]) {
            delete messageToSend[msgType].contextInfo;
        }

        await conn.sendMessage(targetJid, messageToSend);

        reply(`✅ Forwarded to ${targetJid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
