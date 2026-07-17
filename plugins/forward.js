const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

const tempDir = path.join(os.tmpdir(), 'forward-plugin');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function getQuotedMessage(mek) {
  return mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function getMediaType(msgType) {
  const map = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    ptvMessage: 'ptv',
  };
  return map[msgType] || null;
}

function getFileExt(msgType, mediaMsg) {
  const nameExt = mediaMsg?.fileName ? path.extname(mediaMsg.fileName) : '';
  if (nameExt) return nameExt;

  if (msgType === 'imageMessage') return '.jpg';
  if (msgType === 'videoMessage') return '.mp4';
  if (msgType === 'audioMessage') return mediaMsg?.ptt ? '.ogg' : '.mp3';
  if (msgType === 'stickerMessage') return '.webp';
  if (msgType === 'documentMessage') return '.bin';
  if (msgType === 'ptvMessage') return '.mp4';
  return '.bin';
}

async function streamToFile(stream, filePath) {
  await pipeline(stream, fs.createWriteStream(filePath));
}

cmd({
  pattern: 'forward',
  alias: ['fo'],
  desc: 'Forward quoted message or media',
  category: 'main',
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  let tempPath = null;

  try {
    const quotedMessage = getQuotedMessage(mek);

    if (!quotedMessage) return reply('❌ Reply to a message first.');
    if (!q || !q.trim()) return reply('❌ Provide a target JID.');

    const targetJid = q.trim();
    const msgType = Object.keys(quotedMessage)[0];
    const mediaMsg = quotedMessage[msgType];

    if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
      const text = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
      if (!text) return reply('❌ Empty text message.');

      await conn.sendMessage(targetJid, { text });
      return reply(`✅ Forwarded to ${targetJid}`);
    }

    const mediaType = getMediaType(msgType);
    if (!mediaType) return reply(`❌ Unsupported message type: ${msgType}`);

    const stream = await downloadContentFromMessage(mediaMsg, mediaType);
    const ext = getFileExt(msgType, mediaMsg);
    tempPath = path.join(tempDir, `fwd_${Date.now()}${ext}`);

    await streamToFile(stream, tempPath);

    const options = {};
    const fileStream = fs.createReadStream(tempPath);

    if (msgType === 'documentMessage') {
      options.document = fileStream;
      options.fileName = mediaMsg.fileName || `document${ext}`;
      options.mimetype = mediaMsg.mimetype || 'application/octet-stream';
      if (mediaMsg.caption) options.caption = mediaMsg.caption;
    } else if (msgType === 'imageMessage') {
      options.image = fileStream;
      options.mimetype = mediaMsg.mimetype || 'image/jpeg';
      if (mediaMsg.caption) options.caption = mediaMsg.caption;
    } else if (msgType === 'videoMessage' || msgType === 'ptvMessage') {
      options.video = fileStream;
      options.mimetype = mediaMsg.mimetype || 'video/mp4';
      if (mediaMsg.caption) options.caption = mediaMsg.caption;
      if (msgType === 'ptvMessage' || mediaMsg.ptv) options.ptv = true;
    } else if (msgType === 'audioMessage') {
      options.audio = fileStream;
      options.mimetype = mediaMsg.mimetype || 'audio/ogg';
      if (mediaMsg.ptt) options.ptt = true;
    } else if (msgType === 'stickerMessage') {
      options.sticker = fileStream;
    } else {
      return reply(`❌ Unsupported media type: ${msgType}`);
    }

    await conn.sendMessage(targetJid, options);
    return reply(`✅ Forwarded successfully to ${targetJid}`);
  } catch (e) {
    console.error('Forward Error:', e);
    return reply(`❌ Error: ${e.message}`);
  } finally {
    if (tempPath) {
      fs.unlink(tempPath, () => {});
    }
  }
});
