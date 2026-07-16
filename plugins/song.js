const {cmd , commands} = require('../command')
const ytdl = require('@distube/ytdl-core')
const yts = require('yt-search')

cmd({
    pattern: "song",
    desc: "download songs",
    category: "downlod",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
 if(!q) return reply("please give me url or title")
 const search = await yts(q);
 const data = search.videos[0];
 if (!data) return reply("Couldn't find that song.")
 const url = data.url

let desc = `
⭐ *MOVIEHUB-DL-BOT song DOWNLOADER* ⭐
    
    title: ${data.title}
    description: ${data.description}
    time: ${data.timestamp}
    ago: ${data.ago}
    views: ${data.views}
    
    MADE BY SAHAN DISSANAYAKA 💚
    `
    await conn.sendMessage(from,{image:{url: data.thumbnail},caption:desc}, {quoted:mek});

    //download audio directly from YouTube (no third-party API middleman)
    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const audioBuffer = Buffer.concat(chunks)

    //send audio + document message
    await conn.sendMessage(from,{audio:audioBuffer,mimetype:"audio/mpeg"},{quoted:mek})
    await conn.sendMessage(from,{document:audioBuffer,mimetype:"audio/mpeg",fileName:data.title + ".mp3",caption:"MADE BY LIYANAARACHCHI AVISHKA THIMIRA LAKSHAN 💚"},{quoted:mek})
    
}catch(e){
console.log(e)
reply(`${e}`)
} 
})
