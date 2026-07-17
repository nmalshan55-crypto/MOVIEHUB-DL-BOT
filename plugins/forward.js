const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

const tempDir = path.join(os.tmpdir(), 'forward-plugin');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward message (Best for large files)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    let tempPath = null;

    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply("❌ Reply to a message first!");

        if (!q || !q.trim()) return reply("❌ Provide target JID!");

        const jid = q.trim();
        const msgType = Object.keys(quoted)[0];
        const media = quoted[msgType];

        // Text
        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
            await conn.sendMessage(jid, { text });
            return reply(`✅ Forwarded to ${jid}`);
        }

        const type = {
            imageMessage: 'image',
            videoMessage: 'video',
            audioMessage: 'audio',
            stickerMessage: 'sticker',
            documentMessage: 'document'
        }[msgType];

        if (!type) return reply(`❌ Unsupported: ${msgType}`);

        // Stream to disk
        const stream = await downloadContentFromMessage(media, type);
        tempPath = path.join(tempDir, `fwd_\( {Date.now()} \){path.extname(media.fileName || '.bin')}`);
        await pipeline(stream, fs.createWriteStream(tempPath));

        // Send using url (Best for large files)
        const payload = {
            mimetype: media.mimetype,
            caption: media.caption || '',
            fileName: media.fileName,
            ptt: msgType === 'audioMessage' ? !!media.ptt : undefined
        };

        if (msgType === 'documentMessage') {
            payload.document = { url: tempPath };
            payload.fileName = media.fileName || 'document';
        } else if (msgType === 'imageMessage') {
            payload.image = { url: tempPath };
        } else if (msgType === 'videoMessage') {
            payload.video = { url: tempPath };
        } else if (msgType === 'audioMessage') {
            payload.audio = { url: tempPath };
        } else if (msgType === 'stickerMessage') {
            payload.sticker = { url: tempPath };
            delete payload.mimetype;
        }

        await conn.sendMessage(jid, payload);

        reply(`✅ Forwarded to ${jid}`);

    } catch (e) {
        console.error('Forward Error:', e);
        reply(`❌ Error: ${e.message}`);
    } finally {
        if (tempPath) {
            setTimeout(() => fs.unlink(tempPath, () => {}), 15000);
        }
    }
});
