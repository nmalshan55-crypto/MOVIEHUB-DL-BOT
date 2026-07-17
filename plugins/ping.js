const { cmd } = require('../command');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "ping",
    alias: ["p", "speed"],
    react: "⏰",
    desc: "Check bot response speed and uptime.",
    category: "main",
    use: ".ping",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const start = performance.now();
        const latency = (performance.now() - start).toFixed(0);

        const status = `
╭─── *🏓 PING STATUS 🏓* ───╮
│
│ ⚡ *Response Time*: ${latency} ms
│ ⏰ *Uptime*: ${runtime(process.uptime())}
│
╰───────────────────╯
> *POWERED BY MOVIEHUB-DL BOT*`;

        await reply(status);

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ *Error*: ${e.message || "Failed to fetch ping status"}\n\n*MOVIEHUB-DL BOT*`);
    }
});
