const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["getjid", "chatid"],
    desc: "Get the JID of the current chat, or a replied/mentioned user",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        let text = `📌 *JID Information*\n\n`;
        text += `*Current Chat JID:*\n${from}\n`;

        if (from.endsWith('@g.us')) text += `_(Group Chat)_`;
        else if (from.endsWith('@newsletter')) text += `_(Channel / Newsletter)_`;
        else text += `_(Private Chat)_`;

        const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
        const quotedParticipant = contextInfo?.participant;
        const mentionedJids = contextInfo?.mentionedJid;

        if (quotedParticipant) {
            text += `\n\n*Replied User's JID:*\n${quotedParticipant}`;
        }

        if (mentionedJids && mentionedJids.length) {
            text += `\n\n*Mentioned User(s) JID:*\n${mentionedJids.join('\n')}`;
        }

        await reply(text);
    } catch (e) {
        console.error('JID command error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
