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
  return {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    ptvMessage: 'ptv'
  }[msgType] || null;
}

function getExt(msgType, mediaMsg) {
  const fromName = mediaMsg?.fileName ? path.extname(mediaMsg.fileName) : '';
  if (fromName) return fromName;
  if (msgType === 'imageMessage') return '.jpg';
  if (msgType === 'videoMessage' || msgType === 'ptvMessage') return '.mp4';
  if (msgType === 'audioMessage') return mediaMsg?.ptt ? '.ogg' : '.mp3';
  if (msgType === 'stickerMessage') return '.webp';
  if (msgType === 'documentMessage') return '.bin';
  return '.bin';
}

async function streamToFile(stream, filePath) {
  await pipeline(stream, fs.createWriteStream(filePath));
}

cmd({
  pattern: 'forward',
  alias: ['fwd'],
  desc: 'Forward quoted message',
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
    tempPath = path.join(tempDir, `fwd_${Date.now()}${getExt(msgType, mediaMsg)}`);
    await streamToFile(stream, tempPath);

    const fileStream = fs.createReadStream(tempPath);

    const message = {};
    if (msgType === 'imageMessage') {
      message.image = fileStream;
      if (mediaMsg.caption) message.caption = mediaMsg.caption;
      message.mimetype = mediaMsg.mimetype || 'image/jpeg';
    } else if (msgType === 'videoMessage' || msgType === 'ptvMessage') {
      message.video = fileStream;
      if (mediaMsg.caption) message.caption = mediaMsg.caption;
      message.mimetype = mediaMsg.mimetype || 'video/mp4';
      if (msgType === 'ptvMessage' || mediaMsg.ptv) message.ptv = true;
    } else if (msgType === 'audioMessage') {
      message.audio = fileStream;
      message.mimetype = mediaMsg.mimetype || 'audio/ogg';
      if (mediaMsg.ptt) message.ptt = true;
    } else if (msgType === 'documentMessage') {
      message.document = fileStream;
      message.fileName = mediaMsg.fileName || `document${getExt(msgType, mediaMsg)}`;
      message.mimetype = mediaMsg.mimetype || 'application/octet-stream';
      if (mediaMsg.caption) message.caption = mediaMsg.caption;
    } else if (msgType === 'stickerMessage') {
      message.sticker = fileStream;
    }

    await conn.sendMessage(targetJid, message);

    fileStream.close();
    fs.unlink(tempPath, () => {});
    return reply(`✅ Forwarded successfully to ${targetJid}`);
  } catch (e) {
    console.error('Forward Error:', e);
    return reply(`❌ Error: ${e.message}`);
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      setTimeout(() => fs.unlink(tempPath, () => {}), 10000);
    }
  }
});
