const { cmd } = require('../command');

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward large files using original media key (Low Memory)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a message first!");
        if (!q || !q.trim()) return reply("❌ Provide target JID!");

        const targetJid = q.trim();

        // Clone the quoted message
        const messageToSend = JSON.parse(JSON.stringify(quotedMessage));

        // Remove forwarded tag / contextInfo
        const msgType = Object.keys(messageToSend)[0];
        if (messageToSend[msgType]?.contextInfo) {
            delete messageToSend[msgType].contextInfo;
        }

        // Try to send using original media data
        await conn.sendMessage(targetJid, messageToSend);

        reply(`✅ Forwarded to ${targetJid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Error: ${e.message}\n\nTrying alternative method...`);
      
    }
});
