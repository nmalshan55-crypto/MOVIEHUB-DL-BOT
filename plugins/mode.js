const { cmd } = require('../command');
const { getMode, setMode } = require('../lib/botMode');

cmd({
    pattern: "mode",
    desc: "Change bot mode (public/private/inbox/group)",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { q, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("❌ *Only the bot owner can change the mode.*");

        const validModes = ['public', 'private', 'inbox', 'group'];
        const choice = (q || '').trim().toLowerCase();

        if (!choice) {
            const current = await getMode();
            return reply(
`⚙️ *Current Mode:* ${current}

*Usage:* .mode <public|private|inbox|group>

• *public* - anyone can use the bot
• *private* - only the owner can use commands
• *inbox* - commands only work in private chats
• *group* - commands only work in groups`
            );
        }

        if (!validModes.includes(choice)) {
            return reply("❌ *Invalid mode.* Choose one of: public, private, inbox, group");
        }

        await setMode(choice);
        reply(`✅ *Bot mode set to:* ${choice}`);
    } catch (e) {
        console.error('Mode command error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
