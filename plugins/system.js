const config = require('../config');
const { cmd } = require('../command');
const os = require('os');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "system",
    alias: ["status", "botinfo"],
    desc: "Displays bot system status including uptime, RAM, CPU, and OS details.",
    category: "main",
    use: ".system",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // Calculate RAM usage
        const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);

        // Get system info
        const status = `
╭─── *🖥️ SYSTEM STATUS 🖥️* ───╮
│
│ ⏰ *Uptime*: ${runtime(process.uptime())}
│ 💾 *RAM Usage*: ${usedMem} MB / ${totalMem} MB
│ 🆓 *Free Memory*: ${freeMem} MB
│ ⚙️ *Platform*: ${os.platform()} (${os.arch()})
│ 🖱️ *CPU*: ${os.cpus()[0]?.model || 'Unknown'}
│ 🖧 *Hostname*: ${os.hostname()}
│ 🧑‍💻 *Owner*: LAKSHSN
│
╰───────────────────╯
*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙴𝚎𝚂*`;

        await reply(status);

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ *Error*: ${e.message || "Failed to fetch system status"}\n\n*𝙲𝙸𝙽𝙴𝚅𝙸𝙱𝙴𝚂 𝙻𝙺 𝙾𝙵𝙵𝙸𝙴𝚎𝚂*`);
    }
});
