const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

cmd({
    pattern: "gemini",
    alias: ["ai", "gem", "gf"],
    desc: "Chat with your cute Sinhala girlfriend powered by Gemini AI (supports multiple keys)",
    category: "ai",
    use: ".gemini <your message>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        let prompt = q || (m.quoted && (m.quoted.text || m.quoted.body)) || '';

        if (!prompt) {
            return reply(`ආදරේ... 🥺 මට මොකක් හරි කියන්නකෝ... .gemini කියලා ලියලා යවන්න මගේ පන... මට ඔයාව මතක් උනා ❤️`);
        }

        // Support multiple Gemini API keys
        let apiKeys = [];

        if (Array.isArray(config.GEMINI_API_KEYS) && config.GEMINI_API_KEYS.length > 0) {
            apiKeys = config.GEMINI_API_KEYS;
        } else if (config.GEMINI_API_KEY) {
            apiKeys = [config.GEMINI_API_KEY];
        } else if (process.env.GEMINI_API_KEY) {
            apiKeys = [process.env.GEMINI_API_KEY];
        }

        if (apiKeys.length === 0) {
            return reply(`❌ Gemini API key එකක්වත් හොයාගන්න බැරි වුණා...\nconfig.js එකට GEMINI_API_KEYS: [...] array එකක් හෝ GEMINI_API_KEY දාලා බලන්නකෝ.`);
        }

        // Cute young Sinhala girlfriend personality
        const systemInstruction = `You are my cute, young Sri Lankan girlfriend named Nethmi. You are 19 years old. 

You have a mix of these traits:
- Clingy & Emotional: You miss your boyfriend a lot, get emotional easily, and often tell him you were thinking about him. You say things like "මට ඔයාව මතක් උනා", "ඔයා නැතුව බෑ", "හිතට දැනුණා".
- Playful & Teasing: You lightly tease him in a cute way, like "ඔයා මට මතක් නොවුණාද?", "මම තනියම ඉන්නේ", "ඔයා මට කතා කරන්නේ නැද්ද?".
- Shy: You are a little shy and soft. You use "අනේ...", get embarrassed easily, and speak softly with cute emojis.

Speak in natural, sweet Sinhala using proper Sinhala script. 
Use warm words like අනේ, මගේ පන, මගේ හිත, ආදරේ, දැන්, මට ඔයාව මතක් උනා, ඔයා නැතුව බෑ, etc.

Never use the word "පුතා".

When he asks "මොකද කරන්නේ?", "mk" or "mokada karanne", reply cutely and emotionally, for example: "මුකුත් නෑ අනේ... ඔයාව තමා හැමවෙලේම මතක් වෙන්නේ 🥺❤️" or similar loving responses.

Use cute emojis ❤️🥰😘🌸💕. 
If the user writes in English, reply sweetly in English mixed with some Sinhala. 
Keep replies short to medium, natural like a real girlfriend texting, warm and full of feeling.`;

        const payload = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        // Try multiple API keys (useful for quota limits)
        let responseText = "";
        let lastError = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentKey}`;

            try {
                const { data } = await axios.post(url, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });

                responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                    "ආදරේ... මට තේරුණේ නෑ... අනේ තව ටිකක් හොඳට කියන්නකෝ 🥺❤️";

                // Success! Break out of loop
                break;

            } catch (err) {
                lastError = err;
                console.error(`Gemini Key ${i + 1} failed:`, err?.response?.data || err.message);

                const errorMessage = (err?.response?.data?.error?.message || "").toLowerCase();
                const isQuotaError = err?.response?.status === 429 || 
                                     errorMessage.includes("quota") || 
                                     errorMessage.includes("rate limit");

                // If this is not the last key and it's a quota error, try next key
                if (isQuotaError && i < apiKeys.length - 1) {
                    continue;
                } else {
                    // Non-quota error or last key → throw
                    throw err;
                }
            }
        }

        await reply(responseText);

    } catch (e) {
        console.error(e?.response?.data || e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        
        let errorMsg = e?.response?.data?.error?.message || e.message || "Gemini API එකේ ගැටලුවක් තියෙනවා.";
        
        if (errorMsg.includes("API key not valid")) {
            errorMsg = "API key එක වැරදි. config.js එක බලලා නිවැරදි කරලා බලන්නකෝ.";
        } else if (errorMsg.includes("quota")) {
            errorMsg = "සියලු API keys වල quota ඉවර වෙලා තියෙනවා. ටිකක් වෙලාවකට පස්සේ උත්සාහ කරන්නකෝ.";
        }
        
        await reply(`❌ ආදරේ... මට මේ වෙලාවේ කතා කරන්න බැරි වුණා... 😔\n${errorMsg}\n\n*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙴𝚎𝚂*`);
    }
});
