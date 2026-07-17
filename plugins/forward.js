const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward message without tag (supports large files)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply("❌ Reply to a message!");

        if (!q?.trim()) return reply("❌ Provide JID!\n`.forward 947xxxxxxxx@s.whatsapp.net`");

        const targetJid = q.trim();
        const msgType = Object.keys(quoted)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quoted.conversation || quoted.extendedTextMessage?.text;
            return await conn.sendMessage(targetJid, { text });
        }

        const mediaMsg = quoted[msgType];
        const type = msgType.replace('Message', '').toLowerCase();

        const stream = await downloadContentFromMessage(mediaMsg, type);

        let options = {};

        if (msgType === 'documentMessage') {
            const tempPath = path.join(tempDir, `fwd_\( {Date.now()} \){path.extname(mediaMsg.fileName || '.bin')}`);
            const write = fs.createWriteStream(tempPath);
            for await (const chunk of stream) write.write(chunk);
            await new Promise(r => write.end(r));

            options = {
                document: fs.createReadStream(tempPath),
                fileName: mediaMsg.fileName || 'document',
                mimetype: mediaMsg.mimetype || 'application/octet-stream',
                caption: mediaMsg.caption || ''
            };

            // Cleanup after send
            setTimeout(() => fs.unlink(tempPath, () => {}), 5000);
        } else {
            const buffer = await streamToBuffer(stream);
            options = { [type]: buffer };

            if (mediaMsg.mimetype) options.mimetype = mediaMsg.mimetype;
            if (mediaMsg.caption) options.caption = mediaMsg.caption;
            if (msgType === 'audioMessage' && mediaMsg.ptt) options.ptt = true;
        }

        await conn.sendMessage(targetJid, options);
        reply(`✅ Forwarded to ${targetJid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}
