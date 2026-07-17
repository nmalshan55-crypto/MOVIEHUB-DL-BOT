const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

const tempDir = path.join(os.tmpdir(), 'forward-plugin');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function quoted(mek) {
  return mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function mediaType(msgType) {
  return {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    ptvMessage: 'ptv'
  }[msgType] || null;
}

function extOf(msgType, mediaMsg) {
  const ext = mediaMsg?.fileName ? path.extname(mediaMsg.fileName) : '';
  if (ext) return ext;
  if (msgType === 'imageMessage') return '.jpg';
  if (msgType === 'videoMessage' || msgType === 'ptvMessage') return '.mp4';
  if (msgType === 'audioMessage') return mediaMsg?.ptt ? '.ogg' : '.mp3';
  if (msgType === 'stickerMessage') return '.webp';
  return '.bin';
}

async function saveStream(stream, filePath) {
  await pipeline(stream, fs.createWriteStream(filePath));
}

cmd({
  pattern: 'forward',
  alias: ['fwd'],
  desc: 'Forward quoted message',
  category: 'main',
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  let tempPath;

  try {
    const qmsg = quoted(mek);
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

    const type = mediaType(msgType);
    if (!type) return reply(`❌ Unsupported type: ${msgType}`);

    const stream = await downloadContentFromMessage(msg, type);
    tempPath = path.join(tempDir, `fwd_${Date.now()}${extOf(msgType, msg)}`);
    await saveStream(stream, tempPath);

    let payload = {};

    if (msgType === 'imageMessage') {
      payload = {
        image: { url: tempPath },
        mimetype: msg.mimetype || 'image/jpeg',
        caption: msg.caption || undefined
      };
    } else if (msgType === 'videoMessage' || msgType === 'ptvMessage') {
      payload = {
        video: { url: tempPath },
        mimetype: msg.mimetype || 'video/mp4',
        caption: msg.caption || undefined,
        ptv: msgType === 'ptvMessage' || !!msg.ptv
      };
    } else if (msgType === 'audioMessage') {
      payload = {
        audio: { url: tempPath },
        mimetype: msg.mimetype || 'audio/ogg',
        ptt: !!msg.ptt
      };
    } else if (msgType === 'documentMessage') {
      payload = {
        document: { url: tempPath },
        mimetype: msg.mimetype || 'application/octet-stream',
        fileName: msg.fileName || `document${extOf(msgType, msg)}`,
        caption: msg.caption || undefined
      };
    } else if (msgType === 'stickerMessage') {
      payload = {
        sticker: { url: tempPath }
      };
    }

    await conn.sendMessage(jid, payload);

    return reply(`✅ Forwarded successfully to ${jid}`);
  } catch (e) {
    console.error('Forward Error:', e);
    return reply(`❌ Error: ${e.message}`);
  } finally {
    if (tempPath) setTimeout(() => fs.unlink(tempPath, () => {}), 15000);
  }
});
