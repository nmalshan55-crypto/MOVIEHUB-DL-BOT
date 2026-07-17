const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

cmd({
    pattern: "forward",
    alias: ["fo"],
    desc: "Forward a replied message (text/document/video/audio) to a JID without the forwarded tag",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        if (!quotedMessage) {
            return reply("❌ *Reply to a message* (text, document, video, audio, or sticker) *with:*\n.forward <jid>\n\nExample:\n.forward 94771234567@s.whatsapp.net\n\nTip: use .jid to get a valid JID.");
        }
        if (!q || !q.trim()) {
            return reply("❌ *Please provide a target JID.*\n\nExample:\n.forward 94771234567@s.whatsapp.net");
        }

        const targetJid = q.trim();
        if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.endsWith('@g.us')) {
            return reply("❌ *Invalid JID.* Must end with @s.whatsapp.net (private) or @g.us (group).\n\nUse .jid to get a valid JID.");
        }

        const msgType = Object.keys(quotedMessage)[0];

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            if (!text) return reply("❌ *That message has no text content to forward.*");
            await conn.sendMessage(targetJid, { text });

        } else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(msgType)) {
            const mediaMsg = quotedMessage[msgType];
            const typeMap = {
                imageMessage: 'image',
                videoMessage: 'video',
                audioMessage: 'audio',
                documentMessage: 'document',
                stickerMessage: 'sticker'
            };

            const stream = await downloadContentFromMessage(mediaMsg, typeMap[msgType]);
            const buffer = await streamToBuffer(stream);

            const payload = {};
            if (msgType === 'imageMessage') payload.image = buffer;
            if (msgType === 'videoMessage') payload.video = buffer;
            if (msgType === 'audioMessage') payload.audio = buffer;
            if (msgType === 'stickerMessage') payload.sticker = buffer;
            if (msgType === 'documentMessage') {
                payload.document = buffer;
                payload.fileName = mediaMsg.fileName || 'file';
            }
            if (mediaMsg.mimetype) payload.mimetype = mediaMsg.mimetype;
            if (mediaMsg.caption) payload.caption = mediaMsg.caption;
            if (msgType === 'audioMessage' && mediaMsg.ptt) payload.ptt = true;

            await conn.sendMessage(targetJid, payload);

        } else {
            return reply(`❌ *Unsupported message type:* ${msgType}`);
        }

        await reply(`✅ *Forwarded to:* ${targetJid}`);
    } catch (e) {
        console.error('Forward error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
