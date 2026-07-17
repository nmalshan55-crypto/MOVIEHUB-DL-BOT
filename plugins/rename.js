const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

cmd({
    pattern: "rename",
    desc: "Rename document (filename + caption) | video/audio (caption only)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a document/video/audio!");
        if (!q) return reply("❌ Provide new name/caption!");

        const newValue = q.trim();
        const msgType = Object.keys(quotedMessage)[0];

        if (!['documentMessage', 'videoMessage', 'audioMessage'].includes(msgType)) {
            return reply("❌ Only documents, videos, and audios supported.");
        }

        const mediaMsg = quotedMessage[msgType];
        const stream = await downloadContentFromMessage(mediaMsg, msgType.replace('Message', ''));

        let payload = {};
        let tempPath = null;

        if (msgType === 'documentMessage') {
            const ext = path.extname(newValue) || path.extname(mediaMsg.fileName || '') || '.pdf';
            const fileName = newValue.includes('.') ? newValue : newValue + ext;

            tempPath = path.join(tempDir, `rename_\( {Date.now()} \){ext}`);
            const writeStream = fs.createWriteStream(tempPath);
            for await (const chunk of stream) writeStream.write(chunk);
            await new Promise(r => writeStream.end(r));

            payload = {
                document: fs.createReadStream(tempPath),
                fileName: fileName,
                mimetype: mediaMsg.mimetype,
                caption: newValue
            };
        } else {
            const buffer = await streamToBuffer(stream);
            payload = {
                [msgType === 'videoMessage' ? 'video' : 'audio']: buffer,
                mimetype: mediaMsg.mimetype,
                caption: newValue,
                ptt: msgType === 'audioMessage' && mediaMsg.ptt
            };
        }

        await conn.sendMessage(mek.key.remoteJid, payload);

        if (tempPath) fs.unlink(tempPath, () => {});
        reply("✅ Renamed successfully!");
    } catch (e) {
        console.error('Rename error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}
