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
  async (bot, mek, m, { from, q, reply, quoted }) => {
    try {
      if (!quoted) return reply("↩️ Reply to the message you want to forward, then run:\n.forward <jid>");
      if (!q) return reply("📌 Give me a target chat.\nPerson: .forward 94771234567@s.whatsapp.net\nGroup: .forward 120363012345678901@g.us");

      const targetJid = q.trim();
      const quotedMsg = { key: quoted.key, message: quoted.message };

      await bot.forwardMessage(targetJid, quotedMsg, true);
      await reply(`✅ Forwarded to ${targetJid}`);
    } catch (e) {
      console.log("FORWARD ERROR:", e);
      reply("❌ Forward failed: " + e.message);
    }
  }
);
