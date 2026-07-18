const { cmd } = require('../command');

cmd({
    pattern: "menu",
    alias: ["help", "list", "commands"],
    react: "📖",
    desc: "Show all available commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const menuText = `
╭───「 *🎬 MOVIEHUB DL BOT* 」───╮
│
│ 👋 Hello! Here are all available commands
│
├─「 *Main Commands* 」
│ • .alive
│ • .menu / .help
│ • .ping
│ • .system / .status
│ • .restart
│
├─「 *Movie & Series* 」
│ • .movie
│ • .moviebox
│ • .cineru
│ • .cinemx
│ • .cinesubz / .cinetv
│ • .sinhalasub
│ • .baiscope
│ • .cartoon
│ • .anime
│
├─「 *Music* 」
│ • .song
│
├─「 *YouTube & TikTok* 」
│ • .ytmp4 / .ytv
│ • .tiktok / .tt
│
├─「 *Group Management* 」
│ • .kick
│ • .add / .invite
│ • .promote
│ • .demote
│ • .admins
│ • .tagall
│ • .hidetag
│ • .setpp
│ • .open / .unmute
│ • .close / .mute / .lock
│ • .revoke
│ • .grouplink / .link
│ • .setsubject
│ • .setdesc
│ • .groupinfo / .ginfo
│
├─「 *Owner Commands* 」
│ • .jid
│ • .mode
│ • .sendtag
│ • .forward / .fo
│ • .rename
│
├─「 *AI Assistant (English/Singlish)* 」
│ • .gemini <question>
│ • .sethu <ai girlfriend>
│
╰────────────────────╯

*✨ Use commands with your prefix*
*Made with ❤️ for Movie Lovers*
`;

        // Send the custom image with menu as caption
        await conn.sendMessage(from, {
            image: { url: "https://biakk-pissek4.hf.space/api/stream/secure/6a38af067006dd1c80422eb7/moviehub%20dl%20moviebot.jpg" },
            caption: menuText
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ Error loading menu\n\n${e.message}`);
    }
});
