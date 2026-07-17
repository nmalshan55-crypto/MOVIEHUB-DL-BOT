const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "rename",
    react: "📌",
    desc: "Rename document (filename + caption) or video/audio (caption only)",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) {
            return reply("❌ *Reply to a document, video, or audio message*\n\nUsage:\n.rename New File Name.ext\n.rename New caption here");
        }

        if (!q || !q.trim()) {
            return reply("❌ *Please provide new name or caption.*");
        }

        const newValue = q.trim();
        const msgType = Object.keys(quotedMessage)[0];

        if (!['documentMessage', 'videoMessage', 'audioMessage'].includes(msgType)) {
            return reply("❌ Only supports *documents*, *videos*, and *audio*.");
        }

        const mediaMsg = quotedMessage[msgType];
        const stream = await downloadContentFromMessage(mediaMsg, 
            msgType === 'documentMessage' ? 'document' : 
            msgType === 'videoMessage' ? 'video' : 'audio'
        );

        let payload = {};
        let tempPath = null;

        if (msgType === 'documentMessage') {
            const ext = path.extname(newValue) || path.extname(mediaMsg.fileName || '') || '.pdf';
            const fileName = newValue.includes('.') ? newValue : newValue + ext;

            tempPath = path.join(__dirname, `../temp/rename_\( {Date.now()} \){ext}`);
            const writeStream = fs.createWriteStream(tempPath);
            for await (const chunk of stream) writeStream.write(chunk);
            await new Promise(r => writeStream.end(r));

            payload = {
                document: fs.createReadStream(tempPath),
                fileName: fileName,
                mimetype: mediaMsg.mimetype || 'application/octet-stream',
                caption: newValue // Use the whole input as caption too for documents
            };
        } 
        else {
            // Video / Audio → only caption
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

        await reply(`✅ *Renamed successfully!*`);
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
