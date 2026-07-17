const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "cz",
    alias: ["cine"],
    desc: "Search and download movies from CineSubz",
    category: "download",
    react: "🎥",
},
async (socket, msg, m, { from, args }) => {
    const sender = from;
    const DEFAULT_FOOTER = `\n\n> Powered by MovieHub-DL`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `( ERROR )\n\nInvalid Usage!\n\n🎬 Example:\n.cinetv spider man\n\nPlease provide the Movie name!${DEFAULT_FOOTER}`
        }, { quoted: msg });
        return;
    }

    const cinesubQuery = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `( SEARCHING )\n\nSearching Cinesubz...\nPlease wait a moment.`
    });

    // 🚀 ඔයාගේ Koyeb API එක සහ ආරක්ෂිත Key එක
    const API_BASE = "https://inherent-elayne-shandroid770-59fb0872.koyeb.app";
    const API_KEY = process.env.SAHAN_API_KEY || ""; 
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        // 1. Search Request
        const searchResponse = await axios.get(`${API_BASE}/api/search?text=${encodeURIComponent(cinesubQuery)}&api_key=${API_KEY}`);
        const searchData = searchResponse.data;

        if (!searchData.success || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: `( NO RESULTS )\n\nNo Results Found!\n\nQuery: ${cinesubQuery}${DEFAULT_FOOTER}`
            }, { quoted: msg });
            return;
        }

        const cinesubResults = searchData.results.slice(0, 20);
        let listText = `( SEARCH RESULTS )\n\nQuery: ${cinesubQuery}\nResults: ${cinesubResults.length} Items\n\nSELECT A NUMBER:\n\n`;

        cinesubResults.forEach((item, index) => {
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `${num} ➜ 🎥 ${item.title}\n`;
        });

        listText += `${DEFAULT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;

        // 2. Selection Handling (Reply Listener)
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= cinesubResults.length) {
                    await socket.sendMessage(sender, { text: `⚠️ Invalid number! Range: 01 - ${cinesubResults.length}` }, { quoted: replyMek });
                    return;
                }

                const selectedItem = cinesubResults[choice];
                
                await socket.sendMessage(sender, { text: `( FETCHING )\n\nFetching Movie Details...` }, { quoted: replyMek });

                try {
                    // 2. Fetch Details (කෙලින්ම අලුත් මුදාහැරීමට අනුව දත්ත ලබාගැනීම)
                    const detailsResponse = await axios.get(`${API_BASE}/api/fetch?url=${encodeURIComponent(selectedItem.url)}&api_key=${API_KEY}`);
                    const movieRes = detailsResponse.data;

                    if (!movieRes.success || !movieRes.data || !movieRes.data.downloadUrls) {
                        await socket.sendMessage(sender, { text: "⚠️ No direct downloads found for this movie!" }, { quoted: replyMek });
                        return;
                    }

                    const movieInfo = movieRes.data;
                    
                    // මොබයිල් කියවීමට පහසු වෙන්න විස්තරය (Description) මුල් වචන කිහිපයකට සීමා කිරීම
                    const shortDesc = movieInfo.description ? (movieInfo.description.substring(0, 160) + '...') : 'N/A';

                    // Movie Card (No Fancy/Normal Bold for Facebook Compatibility)
                    let movieDetailsText = `( MOVIE DETAILS )\n\nTitle: ${movieInfo.title}\nDirector: ${movieInfo.meta?.director || 'N/A'}\nYear: ${movieInfo.meta?.year || 'N/A'}\nCountry: ${movieInfo.meta?.country || 'N/A'}\nSub By: ${movieInfo.meta?.subtitleBy || 'N/A'}\n\nStory: ${shortDesc}${DEFAULT_FOOTER}`;
                    
                    const moviePosterUrl = movieInfo.poster || selectedItem.poster || DEFAULT_IMAGE;
                    await socket.sendMessage(sender, { image: { url: moviePosterUrl }, caption: movieDetailsText }, { quoted: replyMek });

                    // ඩවුන්ලෝඩ් ඔප්ෂන්ස් ඇරේ එකක් විදිහට සකස් කිරීම
                    const dlKeys = Object.keys(movieInfo.downloadUrls); // ['480p', '720p', '1080p']
                    
                    if (dlKeys.length === 0) {
                        await socket.sendMessage(sender, { text: "⚠️ Active links not available!" }, { quoted: replyMek });
                        return;
                    }

                    let downloadOptionsText = `( DOWNLOADS )\n\nSelect Quality:\n\n`;
                    dlKeys.forEach((quality, i) => {
                        const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                        downloadOptionsText += `${num} ➜ 🎥 ${quality}\n`;
                    });
                    downloadOptionsText += `\nREPLY WITH NUMBER TO DOWNLOAD${DEFAULT_FOOTER}`;

                    const downloadOptionsMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                    
                    // 3. Download Listener
                    const handleDownload = async ({ messages: downloadMessages }) => {
                        const downloadMek = downloadMessages[0];
                        if (!downloadMek?.message) return;

                        const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                        const isReplyToOptionsMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === downloadOptionsMsg.key.id;

                        if (isReplyToOptionsMsg && sender === downloadMek.key.remoteJid) {
                            const choiceNum = parseInt(downloadChoice) - 1;
                            
                            if (choiceNum >= 0 && choiceNum < dlKeys.length) {
                                const selectedQuality = dlKeys[choiceNum];
                                const finalDirectLink = movieInfo.downloadUrls[selectedQuality];

                                await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                try {
                                    const fileStream = await axios({ 
                                        method: 'get', 
                                        url: finalDirectLink, 
                                        responseType: 'stream', 
                                        headers: { 'User-Agent': 'Mozilla/5.0' } 
                                    });

                                    await socket.sendMessage(sender, {
                                        document: fileStream.data,
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} - ${selectedQuality}.mp4`,
                                        caption: `( MOVIE )\n\nTitle: ${movieInfo.title}\nQuality: ${selectedQuality}`
                                    }, { quoted: downloadMek });

                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });

                                } catch (dlErr) {
                                    console.error(dlErr);
                                    await socket.sendMessage(sender, { text: `❌ Download Failed: ${dlErr.message}` }, { quoted: downloadMek });
                                }
                            } else {
                                await socket.sendMessage(sender, { text: "⚠️ Invalid selection!" }, { quoted: downloadMek });
                            }
                            socket.ev.off('messages.upsert', handleDownload);
                            socket.ev.off('messages.upsert', handleSelection);
                        }
                    };
                    socket.ev.on('messages.upsert', handleDownload);
                } catch (err) { 
                    console.error(err);
                    socket.ev.off('messages.upsert', handleSelection); 
                }
            }
        };
        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error(error);
    }
});
