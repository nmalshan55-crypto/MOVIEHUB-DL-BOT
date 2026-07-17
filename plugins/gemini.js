const { cmd } = require("../command");
const axios = require("axios");

const API_BASE = "https://ai-proxy-server-smoky.vercel.app/";

cmd(
  {
    pattern: "gemini",
    react: "âœ¨",
    desc: "Chat with Gemini AI",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    if (!q) return reply("âŒ Provide a query or prompt.");

    try {
      const payload = { query: q };
      const res = await axios.post(`${API_BASE}/gemini`, payload);

      await danuwa.sendMessage(
        from,
        { text: res.data.answer || "âŒ No response" },
        { quoted: mek }
      );
    } catch (err) {
      console.error("Gemini Error:", err.message);
      reply("âŒ Failed to fetch response from GEMINI.");
    }
  }
);
