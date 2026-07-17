const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward large documents",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply("❌ Reply to a message!");

        if (!q?.trim()) return reply("❌ Provide JID!");

        const targetJid = q.trim();
        const msgType = Object.keys(quoted)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
            await conn.sendMessage(targetJid, { text });
            return reply(`✅ Forwarded!`);
        }

        const mediaMsg = quoted[msgType];
        const type = msgType.replace('Message', '').toLowerCase();

        const stream = await downloadContentFromMessage(mediaMsg, type);

        let messageOptions = {};

        if (msgType === 'documentMessage') {
            const tempPath = path.join(tempDir, `doc_\( {Date.now()} \){path.extname(mediaMsg.fileName || '.bin')}`);

            const writer = fs.createWriteStream(tempPath);
            for await (const chunk of stream) writer.write(chunk);
            await new Promise((resolve) => writer.end(resolve));

            // Read as buffer for reliability
            const buffer = fs.readFileSync(tempPath);

            messageOptions = {
                document: buffer,
                fileName: mediaMsg.fileName || 'document',
                mimetype: mediaMsg.mimetype || 'application/octet-stream',
                caption: mediaMsg.caption || ''
            };

            fs.unlinkSync(tempPath);
        } else {
            const buffer = await streamToBuffer(stream);
            messageOptions[type] = buffer;
            if (mediaMsg.mimetype) messageOptions.mimetype = mediaMsg.mimetype;
            if (mediaMsg.caption) messageOptions.caption = mediaMsg.caption;
            if (msgType === 'audioMessage' && mediaMsg.ptt) messageOptions.ptt = true;
        }

        await conn.sendMessage(targetJid, messageOptions);
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
