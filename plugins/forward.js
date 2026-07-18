const { cmd } = require("../command");

cmd(
  {
    pattern: "forward",
    alias: ["fo"],
    react: "📌",
    desc: "Forward the replied message to another chat",
    category: "tools",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      const ctx = mek.message?.extendedTextMessage?.contextInfo;
      if (!ctx || !ctx.quotedMessage) return reply("↩️ Reply to the message you want to forward, then run:\n.forward <jid>");
      if (!q) return reply("📌 Give me a target chat.\nPerson: .forward 94771234567@s.whatsapp.net\nGroup: .forward 120363012345678901@g.us");

      const targetJid = q.trim();
      const quotedKey = { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant, fromMe: false };
      const quotedFull = { key: quotedKey, message: ctx.quotedMessage };

      await bot.forwardMessage(targetJid, quotedFull, true);
      await reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
      console.log("FORWARD ERROR:", e);
      reply("❌ Forward failed: " + e.message);
    }
  }
);
