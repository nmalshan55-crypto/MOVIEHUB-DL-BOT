const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fo"],
    react: "💯",
    desc: "Forward large documents without loading into memory",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply("❌ Reply to a message!");

        if (!q?.trim()) return reply("❌ Provide target JID!");

        const targetJid = q.trim();
        const msgType = Object.keys(quoted)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quoted.conversation || quoted.extendedTextMessage?.text;
            await conn.sendMessage(targetJid, { text });
            return reply(`✅ Forwarded to ${targetJid}`);
        }

        const mediaMsg = quoted[msgType];
        const type = msgType.replace('Message', '').toLowerCase();
        const downloadStream = await downloadContentFromMessage(mediaMsg, type);

        if (msgType === 'documentMessage') {
            const ext = path.extname(mediaMsg.fileName || '.bin');
            const tempPath = path.join(tempDir, `fwd_\( {Date.now()} \){ext}`);

            // Write stream
            const writeStream = fs.createWriteStream(tempPath);
            for await (const chunk of downloadStream) {
                writeStream.write(chunk);
            }
            await new Promise((res, rej) => {
                writeStream.end(res);
                writeStream.on('error', rej);
            });

            // Send using fresh stream (low memory)
            await conn.sendMessage(targetJid, {
                document: fs.createReadStream(tempPath),
                fileName: mediaMsg.fileName || 'document',
                mimetype: mediaMsg.mimetype || 'application/octet-stream',
                caption: mediaMsg.caption || ''
            });

            // Cleanup
            fs.unlink(tempPath, () => {});
        } 
        else {
            // Small media - use buffer
            const buffer = await streamToBuffer(downloadStream);
            const options = { [type]: buffer };

            if (mediaMsg.mimetype) options.mimetype = mediaMsg.mimetype;
            if (mediaMsg.caption) options.caption = mediaMsg.caption;
            if (msgType === 'audioMessage' && mediaMsg.ptt) options.ptt = true;

            await conn.sendMessage(targetJid, options);
        }

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
