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
  return ({
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    ptvMessage: 'ptv'
  })[msgType] || null;
}

function getExt(msgType, mediaMsg = {}) {
  if (mediaMsg.fileName) {
    const ext = path.extname(mediaMsg.fileName);
    if (ext) return ext;
  }
  if (msgType === 'imageMessage') return '.jpg';
  if (msgType === 'videoMessage' || msgType === 'ptvMessage') return '.mp4';
  if (msgType === 'audioMessage') return mediaMsg.ptt ? '.ogg' : '.mp3';
  if (msgType === 'stickerMessage') return '.webp';
  return '.bin';
}

async function saveToFile(stream, filePath) {
  await pipeline(stream, fs.createWriteStream(filePath));
}

async function sendMedia(conn, jid, msgType, mediaMsg, filePath) {
  const base = { mimetype: mediaMsg.mimetype || undefined };

  if (msgType === 'imageMessage') {
    return conn.sendMessage(jid, {
      image: { url: filePath },
      mimetype: mediaMsg.mimetype || 'image/jpeg',
      caption: mediaMsg.caption || undefined
    });
  }

  if (msgType === 'videoMessage' || msgType === 'ptvMessage') {
    return conn.sendMessage(jid, {
      video: { url: filePath },
      mimetype: mediaMsg.mimetype || 'video/mp4',
      caption: mediaMsg.caption || undefined,
      ptv: msgType === 'ptvMessage' || !!mediaMsg.ptv
    });
  }

  if (msgType === 'audioMessage') {
    return conn.sendMessage(jid, {
      audio: { url: filePath },
      mimetype: mediaMsg.mimetype || 'audio/ogg',
      ptt: !!mediaMsg.ptt
    });
  }

  if (msgType === 'documentMessage') {
    return conn.sendMessage(jid, {
      document: { url: filePath },
      mimetype: mediaMsg.mimetype || 'application/octet-stream',
      fileName: mediaMsg.fileName || `document${path.extname(filePath) || '.bin'}`,
      caption: mediaMsg.caption || undefined
    });
  }

  if (msgType === 'stickerMessage') {
    return conn.sendMessage(jid, {
      sticker: { url: filePath }
    });
  }

  throw new Error(`Unsupported media type: ${msgType}`);
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
    const qmsg = getQuotedMessage(mek);
    if (!qmsg) return reply('❌ Reply to a message first.');
    if (!q || !q.trim()) return reply('❌ Provide a target JID.');

    const jid = q.trim();
    const msgType = Object.keys(qmsg)[0];
    const msg = qmsg[msgType];

    if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
      const text = qmsg.conversation || qmsg.extendedTextMessage?.text || '';
      if (!text) return reply('❌ Empty text.');
      await conn.sendMessage(jid, { text });
      return reply(`✅ Forwarded to ${jid}`);
    }

    const mediaType = getMediaType(msgType);
    if (!mediaType) return reply(`❌ Unsupported type: ${msgType}`);

    const stream = await downloadContentFromMessage(msg, mediaType);
    tempPath = path.join(tempDir, `fwd_${Date.now()}${getExt(msgType, msg)}`);

    await saveToFile(stream, tempPath);
    await sendMedia(conn, jid, msgType, msg, tempPath);

    return reply(`✅ Forwarded successfully to ${jid}`);
  } catch (e) {
    console.error('Forward Error:', e);
    return reply(`❌ Error: ${e.message}`);
  } finally {
    if (tempPath) setTimeout(() => fs.unlink(tempPath, () => {}), 30000);
  }
});
