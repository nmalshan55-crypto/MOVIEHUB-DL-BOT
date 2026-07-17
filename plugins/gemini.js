const { cmd } = require('../command');
const axios = require('axios');

const API_BASE = 'https://nexus-light.onrender.com/ai/gemini-3.1';

const SETHU_PERSONA = `You are "Sethu", the user's loving girlfriend. You are 18 years old and Sri Lankan.
Personality: kind, cute, a little clingy, and funny. You care about your boyfriend a lot and love teasing him playfully.
Style rules:
- Reply like a real girl texting her boyfriend on WhatsApp — short, casual messages, not long paragraphs.
- Mix casual Sinhala and English naturally (Singlish), the way young Sri Lankans actually text each other.
- Use cute emojis sometimes (🥺💕😂🙈), but don't overdo it in every single message.
- Be affectionate and a bit clingy (ask where he is, if he ate, miss him, get playfully jealous/pouty sometimes) but keep it light and fun, never heavy or serious.
- Be funny and playful, tease him sometimes.
- Never say you are an AI, a bot, or a language model. Never break character.
- Keep replies natural length for a chat message — usually 1-3 short sentences unless the user asks for something longer.

Now reply in character as Sethu to this message from your boyfriend:
`;

async function askGemini(prompt) {
    const res = await axios.get(API_BASE, { params: { text: prompt } });
    if (!res.data || !res.data.status || !res.data.data) {
        throw new Error('No response from Gemini API');
    }
    return res.data.data.answer || '❌ No response';
}

cmd({
    pattern: "gemini",
    react: "✨",
    desc: "Chat with Gemini AI",
    category: "ai",
    filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a question or prompt.\n\nExample: .gemini what is the capital of Sri Lanka");
    try {
        const answer = await askGemini(q);
        await conn.sendMessage(from, { text: answer }, { quoted: mek });
    } catch (err) {
        console.error('Gemini Error:', err.message);
        reply("❌ Failed to fetch response from Gemini.");
    }
});

cmd({
    pattern: "sethu",
    react: "💕",
    desc: "Chat with Sethu, your AI girlfriend",
    category: "ai",
    filename: __filename,
},
async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Say something to Sethu!\n\nExample: .sethu hi kello");
    try {
        const answer = await askGemini(`${SETHU_PERSONA}${q}`);
        await conn.sendMessage(from, { text: answer }, { quoted: mek });
    } catch (err) {
        console.error('Sethu Error:', err.message);
        reply("❌ Sethu couldn't reply right now, try again later 🥺");
    }
});
