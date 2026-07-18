const { cmd } = require("../command");
const {
  generateWAMessageFromContent,
  generateForwardMessageContent,
} = require("@whiskeysockets/baileys");

cmd(
  {
    pattern: "rename",
    alias: ["rname"],
    react: "💬",
    desc: "Rename a document's file name and caption instantly (no re-upload)",
    category: "tools",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply, quoted }) => {
    try {
      if (!quoted) return reply("↩️ Reply to a document with:\n.rename NewFileName | New caption");
      if (!q || !q.includes("|"))
        return reply("📌 Format: .rename NewFileName | New caption\n\nExample:\n.rename Avatar: Fire & Ash (2026) With Sinhala Subtitle | *Avatar: Fire & Ash (2026) With Sinhala Subtitle*/n/n`[WEB-DL 720P]`/n/n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ ᴍᴏᴠɪᴇ ʙᴏᴛ*");

      const docMsg = quoted.message?.documentMessage;
      if (!docMsg) return reply("❌ The replied message isn't a document.");

      const [rawName, rawCaption] = q.split("|");
      const newName = rawName.trim();
      const newCaption = rawCaption ? rawCaption.trim() : "";
      if (!newName) return reply("❌ File name can't be empty.");

      const ext = docMsg.fileName?.includes(".") ? docMsg.fileName.split(".").pop() : "pdf";

      // Only the metadata is touched here — url/mediaKey/directPath/fileLength
      // are copied through untouched, so nothing is downloaded or re-uploaded.
      const content = await generateForwardMessageContent({ message: quoted.message }, true);
      const ctype = Object.keys(content)[0]; // "documentMessage"

      content[ctype].fileName = `${newName}.${ext}`;
      content[ctype].caption = newCaption;

      const waMessage = await generateWAMessageFromContent(from, content, { quoted: mek });
      await bot.relayMessage(from, waMessage.message, { messageId: waMessage.key.id });
    } catch (e) {
      console.log("RENAME ERROR:", e);
      reply("❌ Rename failed: " + e.message);
    }
  }
);
