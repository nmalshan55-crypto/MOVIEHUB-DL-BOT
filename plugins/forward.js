const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

async function streamToTempFile(stream, prefix = 'forward', ext = '') {
    const tempPath = path.join(tempDir, `\( {prefix}_ \){Date.now()}${ext}`);
    const writeStream = fs.createWriteStream(tempPath);
    
    for await (const chunk of stream) {
        writeStream.write(chunk);
    }
    
    await new Promise((resolve, reject) => {
        writeStream.end(resolve);
        writeStream.on('error', reject);
    });
    
    return tempPath;
}

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward message without forwarded tag (Fixed for large files)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) return reply("❌ Reply to a message first!");
        if (!q || !q.trim()) return reply("❌ Provide target JID!\n`.forward 947xxxxxxxx@s.whatsapp.net`");

        const targetJid = q.trim();
        if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.endsWith('@g.us')) {
            return reply("❌ Invalid JID!");
        }

        const msgType = Object.keys(quotedMessage)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            await conn.sendMessage(targetJid, { text });
        } 
        else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(msgType)) {
            const mediaMsg = quotedMessage[msgType];
            const typeMap = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document', stickerMessage: 'sticker' };

            const stream = await downloadContentFromMessage(mediaMsg, typeMap[msgType]);
            let filePath = null;
            let payload = {};

            if (msgType === 'documentMessage') {
                const ext = path.extname(mediaMsg.fileName || '') || '.bin';
                filePath = await streamToTempFile(stream, 'forward', ext);
                
                payload = {
                    document: fs.createReadStream(filePath),
                    fileName: mediaMsg.fileName || 'document',
                    mimetype: mediaMsg.mimetype || 'application/octet-stream',
                    caption: mediaMsg.caption || ''
                };
            } else {
                const buffer = await streamToBuffer(stream);
                if (msgType === 'imageMessage') payload.image = buffer;
                if (msgType === 'videoMessage') payload.video = buffer;
                if (msgType === 'audioMessage') payload.audio = buffer;
                if (msgType === 'stickerMessage') payload.sticker = buffer;

                if (mediaMsg.mimetype) payload.mimetype = mediaMsg.mimetype;
                if (mediaMsg.caption) payload.caption = mediaMsg.caption;
                if (msgType === 'audioMessage' && mediaMsg.ptt) payload.ptt = true;
            }

            await conn.sendMessage(targetJid, payload);

            // Cleanup
            if (filePath) fs.unlink(filePath, () => {});
        } 
        else {
            return reply(`❌ Unsupported type: ${msgType}`);
        }

        reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
        console.error('Forward error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
                    }
