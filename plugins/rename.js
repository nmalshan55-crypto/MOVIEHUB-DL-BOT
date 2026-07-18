const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

cmd(
  {
    pattern: "rename",
    alias: ["rname"],
    react: "💬",
    desc: "Rename a document's file name and caption instantly (no re-upload)",
    category: "tools",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      const ctx = mek.message?.extendedTextMessage?.contextInfo;
      if (!ctx || !ctx.quotedMessage) return reply("↩️ Reply to a document with:\n.rename NewFileName | New caption");
      if (!q || !q.includes("|"))
        return reply("📌 Format: .rename NewFileName | New caption");

      const docMsg = ctx.quotedMessage.documentMessage;
      if (!docMsg) return reply("❌ The replied message isn't a document.");

      const [rawName, rawCaption] = q.split("|");
      const newName = rawName.trim();
      const newCaption = rawCaption ? rawCaption.trim() : "";
      if (!newName) return reply("❌ File name can't be empty.");

      const ext = docMsg.fileName?.includes(".") ? docMsg.fileName.split(".").pop() : "pdf";
      const quotedKey = { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant, fromMe: false };

      reply("⏳ Renaming...");

      const buffer = await downloadMediaMessage(
        { key: quotedKey, message: ctx.quotedMessage },
        "buffer",
        {}
      );

      await bot.sendMessage(
        from,
        {
          document: buffer,
          fileName: `${newName}.${ext}`,
          mimetype: docMsg.mimetype || "application/octet-stream",
          caption: newCaption,
        },
        { quoted: mek }
      );
    } catch (e) {
      console.log("RENAME ERROR:", e);
      reply("❌ Rename failed: " + e.message);
    }
  }
);
