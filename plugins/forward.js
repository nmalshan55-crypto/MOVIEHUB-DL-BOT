const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function streamToTempFile(stream, ext = '') {
    const tempPath = path.join(__dirname, `../temp/forward_\( {Date.now()} \){ext}`);
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
    alias: ["fo"],
    react: "💬",
    desc: "Forward a replied message (text/document/video/audio) to a JID without the forwarded tag. Now supports large files.",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) {
            return reply("❌ *Reply to a message* (text, document, video, audio, or sticker) *with:*\n.forward <jid>");
        }
        if (!q || !q.trim()) {
            return reply("❌ *Please provide a target JID.*\nExample: .forward 94771234567@s.whatsapp.net");
        }

        const targetJid = q.trim();
        if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.endsWith('@g.us')) {
            return reply("❌ *Invalid JID.* Must end with @s.whatsapp.net or @g.us");
        }

        const msgType = Object.keys(quotedMessage)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            if (!text) return reply("❌ No text content.");
            await conn.sendMessage(targetJid, { text });
        } 
        else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(msgType)) {
            const mediaMsg = quotedMessage[msgType];
            const typeMap = {
                imageMessage: 'image',
                videoMessage: 'video',
                audioMessage: 'audio',
                documentMessage: 'document',
                stickerMessage: 'sticker'
            };

            const stream = await downloadContentFromMessage(mediaMsg, typeMap[msgType]);
            let filePath = null;
            let payload = {};

            // For large files, save to temp
            if (msgType === 'documentMessage') {
                const ext = mediaMsg.fileName ? path.extname(mediaMsg.fileName) : '.bin';
                filePath = await streamToTempFile(stream, ext);
                
                payload = {
                    document: fs.createReadStream(filePath),
                    fileName: mediaMsg.fileName || 'document',
                    mimetype: mediaMsg.mimetype || 'application/octet-stream',
                    caption: mediaMsg.caption || ''
                };
            } 
            else {
                // For smaller media, keep original buffer method (faster)
                const buffer = await streamToBuffer(stream); // reuse your old function
                if (msgType === 'imageMessage') payload.image = buffer;
                if (msgType === 'videoMessage') payload.video = buffer;
                if (msgType === 'audioMessage') payload.audio = buffer;
                if (msgType === 'stickerMessage') payload.sticker = buffer;

                if (mediaMsg.mimetype) payload.mimetype = mediaMsg.mimetype;
                if (mediaMsg.caption) payload.caption = mediaMsg.caption;
                if (msgType === 'audioMessage' && mediaMsg.ptt) payload.ptt = true;
            }

            await conn.sendMessage(targetJid, payload);

            // Clean up temp file
            if (filePath) {
                fs.unlink(filePath, () => {});
            }
        } 
        else {
            return reply(`❌ Unsupported message type: ${msgType}`);
        }

        await reply(`✅ *Forwarded successfully to:* ${targetJid}`);
    } catch (e) {
        console.error('Forward error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

// Keep your original helper
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}
