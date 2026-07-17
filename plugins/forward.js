const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd({
    pattern: "forward",
    alias: ["fwd"],
    desc: "Forward any message without tag (Fixed for large documents)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply("❌ Reply to a message!");

        if (!q?.trim()) return reply("❌ *Provide JID*\n`.forward 947xxxxxxxx@s.whatsapp.net`");

        const targetJid = q.trim();
        const msgType = Object.keys(quoted)[0];

        // Text
        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quoted.conversation || quoted.extendedTextMessage?.text;
            await conn.sendMessage(targetJid, { text });
            return reply(`✅ Forwarded to ${targetJid}`);
        }

        const mediaMsg = quoted[msgType];
        const type = msgType.replace('Message', '').toLowerCase();
        const stream = await downloadContentFromMessage(mediaMsg, type);

        let options = { mimetype: mediaMsg.mimetype };

        if (msgType === 'documentMessage') {
            const ext = path.extname(mediaMsg.fileName || '.bin');
            const tempPath = path.join(tempDir, `fwd_\( {Date.now()} \){ext}`);

            // Write to temp file
            const writeStream = fs.createWriteStream(tempPath);
            for await (const chunk of stream) {
                writeStream.write(chunk);
            }
            await new Promise((resolve, reject) => {
                writeStream.end(resolve);
                writeStream.on('error', reject);
            });

            // Read fresh stream for Baileys
            options.document = fs.createReadStream(tempPath);
            options.fileName = mediaMsg.fileName || 'document';
            options.caption = mediaMsg.caption || '';

            // Cleanup after 10 seconds
            setTimeout(() => fs.unlink(tempPath, () => {}), 10000);
        } 
        else {
            // Image, Video, Audio, Sticker
            const buffer = await streamToBuffer(stream);
            options[type] = buffer;

            if (mediaMsg.caption) options.caption = mediaMsg.caption;
            if (msgType === 'audioMessage' && mediaMsg.ptt) options.ptt = true;
            if (msgType === 'stickerMessage') delete options.mimetype;
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
