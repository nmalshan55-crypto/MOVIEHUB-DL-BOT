const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward message without forwarded tag (Stable Version)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a message!");
        if (!q || !q.trim()) return reply("❌ Provide target JID!");

        const targetJid = q.trim();

        const msgType = Object.keys(quotedMessage)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            await conn.sendMessage(targetJid, { text });
        } else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(msgType)) {

            const mediaMsg = quotedMessage[msgType];
            const type = msgType.replace('Message', '').toLowerCase();

            const stream = await downloadContentFromMessage(mediaMsg, type);

            let options = {};

            if (msgType === 'documentMessage') {
                const ext = path.extname(mediaMsg.fileName || '.bin');
                const tempPath = path.join(tempDir, `fwd_\( {Date.now()} \){ext}`);

                const writer = fs.createWriteStream(tempPath);
                for await (const chunk of stream) writer.write(chunk);
                await new Promise(res => writer.end(res));

                options = {
                    document: fs.createReadStream(tempPath),
                    fileName: mediaMsg.fileName || 'document',
                    mimetype: mediaMsg.mimetype || 'application/octet-stream',
                    caption: mediaMsg.caption || ''
                };

                setTimeout(() => fs.unlink(tempPath, () => {}), 10000);
            } else {
                const buffer = await streamToBuffer(stream);
                options[type] = buffer;

                if (mediaMsg.mimetype) options.mimetype = mediaMsg.mimetype;
                if (mediaMsg.caption) options.caption = mediaMsg.caption;
                if (msgType === 'audioMessage' && mediaMsg.ptt) options.ptt = true;
            }

            await conn.sendMessage(targetJid, options);
        } else {
            return reply("❌ Unsupported message type.");
        }

        await reply(`✅ *Forwarded to:* ${targetJid}`);

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
