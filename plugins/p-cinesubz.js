const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "cz",
    desc: "Search and download movies or TV shows from CineSubz",
    category: "download",
    react: "🎥",
},
async (socket, msg, m, { from, args }) => {
    const sender = from;
    // Facebook/WA වලට කොටු නොවැටී පෙනෙන සරල අකුරු භාවිතය
    const DEFAULT_FOOTER = `\n\n> Powered by MovieHub-DL`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `*❪ ERROR ❫*\n\n⚠️ *Invalid Usage!*\n\n🎬 *Example:*
• .cz spider man
• .cz game of thrones\n\n📝 _Please provide the Movie or TV Series name!_${DEFAULT_FOOTER}`
        }, { quoted: msg });
        return;
    }

    const cinesubQuery = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `*❪ SEARCHING ❫*\n\n🔍 *Searching Cinesubz...*\n⚡ _Please wait a moment._`
    });

    // 🚀 ඔයාගේ අලුත් API Settings (Koyeb URL & Secret Key)
    const API_BASE = "https://inherent-elayne-shandroid770-59fb0872.koyeb.app";
    const API_KEY = process.env.SAHAN_API_KEY || ""; 
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        // 🔍 Search Endpoint (අලුත් API Route එකට අනුව)
        const searchResponse = await axios.get(`${API_BASE}/api/search?text=${encodeURIComponent(cinesubQuery)}&site=cinesubz&api_key=${API_KEY}`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.results || searchData.results.length === 0) {
            await socket.sendMessage(sender, {
                text: `*❪ NO RESULTS ❫*\n\n😞 *No Results Found!*\n\n🎬 *Query:* _${cinesubQuery}_\n💡 *Tip:* _Please check the spelling and try again!_${DEFAULT_FOOTER}`
            }, { quoted: msg });
            return;
        }

        const cinesubResults = searchData.results.slice(0, 25);
        let listText = `*❪ SEARCH RESULTS ❫*\n\n🎯 *Query:* _${cinesubQuery}_\n📊 *Results:* _${cinesubResults.length} Items_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

        cinesubResults.forEach((item, index) => {
            const typeIcon = item.type === 'series' ? '📺' : '🎥';
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `*${num}* ➜ ${typeIcon} _${item.title.substring(0, 35)}_\n`;
        });

        listText += `${DEFAULT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;

        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= cinesubResults.length) {
                    await socket.sendMessage(sender, {
                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${cinesubResults.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = cinesubResults[choice];
                const isTvShow = selectedItem.type === 'series';
                
                if (isTvShow) {
                    // ==========================================
                    // 📺 TV SERIES FLOW
                    // ==========================================
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n📺 *Fetching TV Series...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/fetch?url=${encodeURIComponent(selectedItem.url)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;

                        if (!tvShowData.status || !tvShowData.seasons) {
                            throw new Error('Failed to fetch TV show details');
                        }

                        // Details UI සකස් කිරීම
                        let tvDetailsText = `*❪ TV SERIES DETAILS ❫*\n\n📺 *${tvShowData.title}*\n📝 *Story:* _${tvShowData.description ? (tvShowData.description.substring(0, 150) + '...') : 'N/A'}_\n\n🗿 Source: cinesubz.co${DEFAULT_FOOTER}`;

                        const posterUrl = tvShowData.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: posterUrl },
                            caption: tvDetailsText
                        }, { quoted: replyMek });

                        // Seasons & Episodes ලිස්ට් එක API එකෙන් Extract කිරීම
                        let allEpisodes = [];
                        for (let seasonName in tvShowData.seasons) {
                            const season = tvShowData.seasons[seasonName];
                            
                            // All Episode links තිබේ නම් ඒවා මුලින්ම ගන්නවා
                            if (season.all_episodes && season.all_episodes.length > 0) {
                                season.all_episodes.forEach(allEp => {
                                    allEpisodes.push({ name: `${seasonName} Complete (${allEp.quality})`, ztUrl: allEp.ztUrl });
                                });
                            }
                            // Single Episodes තිබේ නම් ඒවා ගන්නවා
                            if (season.episodes && season.episodes.length > 0) {
                                season.episodes.forEach(ep => {
                                    allEpisodes.push({ name: ep.episode, ztUrl: ep.ztUrl });
                                });
                            }
                        }

                        if (allEpisodes.length === 0) {
                            return await socket.sendMessage(sender, { text: "⚠️ No download episodes found!" });
                        }

                        await socket.sendMessage(sender, { 
                            text: `*❪ DOWNLOAD EPISODES ❫*\n\n📺 *Series:* _${tvShowData.title}_\n🎬 *Episodes Found:* _${allEpisodes.length}_\n⚡ _Starting download process..._${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        let successCount = 0;
                        let failCount = 0;

                        // එකින් එක Episode එක Background එකෙන් Stream කරලා යැවීම
                        for (let i = 0; i < allEpisodes.length; i++) {
                            const episode = allEpisodes[i];
                            try {
                                await socket.sendMessage(sender, { 
                                    text: `*❪ DOWNLOADING ❫*\n\n🎥 *Episode:* _${episode.name}_\n📊 *Progress:* _${i + 1}/${allEpisodes.length}_`
                                }, { quoted: replyMek });

                                // 🔗 Single Bypass Endpoint එකෙන් Direct Stream Link එක ගැනීම
                                const bypassRes = await axios.get(`${API_BASE}/api/bypass?url=${encodeURIComponent(episode.ztUrl)}&api_key=${API_KEY}`);
                                const finalDirectLink = bypassRes.data.url;

                                if (bypassRes.data.status && finalDirectLink) {
                                    // 📥 Stream එකක් ලෙස Download කරමින්ම WhatsApp Upload කිරීම
                                    const fileStream = await axios({
                                        method: 'get',
                                        url: finalDirectLink,
                                        responseType: 'stream',
                                        headers: { 'User-Agent': 'Mozilla/5.0' }
                                    });

                                    await socket.sendMessage(sender, {
                                        document: fileStream.data,
                                        mimetype: 'video/mp4',
                                        fileName: `${tvShowData.title} - ${episode.name}.mp4`,
                                        caption: `*❪ EPISODE ❫*\n\n🎭 *${tvShowData.title}*\n📌 *${episode.name}*${DEFAULT_FOOTER}`
                                    }, { quoted: replyMek });
                                    
                                    successCount++;
                                } else {
                                    failCount++;
                                }
                                
                                await new Promise(resolve => setTimeout(resolve, 3000)); // Server එකට බරක් නොවෙන්න පොඩි 3s Delay එකක්
                                
                            } catch (epError) {
                                console.error(`Error downloading episode:`, epError);
                                failCount++;
                            }
                        }
                        
                        await socket.sendMessage(sender, { 
                            text: `*❪ SUMMARY ❫*\n\n🎉 *Download Complete!*\n\n🎬 *Series:* _${tvShowData.title}_\n✅ *Success:* _${successCount} Episodes_\n❌ *Failed:* _${failCount} Episodes_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        socket.ev.off('messages.upsert', handleSelection);
                        
                    } catch (tvShowError) {
                        console.error('TV Show error:', tvShowError);
                        await socket.sendMessage(sender, {
                            text: `*❪ ERROR ❫*\n\n❌ *TV Details Error!*\n🚫 _${tvShowError.message}_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                    
                } else {
                    // ==========================================
                    // 🎥 MOVIE FLOW
                    // ==========================================
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n🎬 *Fetching Movie...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const detailsResponse = await axios.get(`${API_BASE}/api/fetch?url=${encodeURIComponent(selectedItem.url)}&api_key=${API_KEY}`);
                        const movieInfo = detailsResponse.data;

                        if (!movieInfo.status || !movieInfo.downloads || movieInfo.downloads.length === 0) {
                            await socket.sendMessage(sender, {
                                text: `*❪ NO DOWNLOADS ❫*\n\n⚠️ *No Downloads Found!*\n😞 _There are no downloads available for this movie!_${DEFAULT_FOOTER}`
                            }, { quoted: replyMek });
                            return;
                        }

                        // Details UI සකස් කිරීම
                        const movieDetailsText = `*❪ MOVIE DETAILS ❫*\n\n🎬 *${movieInfo.title}*\n📝 *Story:* _${movieInfo.description ? (movieInfo.description.substring(0, 150) + '...') : 'N/A'}_\n\n🗿 Source: cinesubz.co${DEFAULT_FOOTER}`;

                        const moviePosterUrl = movieInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: moviePosterUrl },
                            caption: movieDetailsText
                        }, { quoted: replyMek });

                        // Download Options UI සෑදීම (API එකෙන් ලැබෙන direct links පාවිච්චි කරමින්)
                        const downloadOptionsText = `*❪ DOWNLOADS ❫*\n\n📥 *Select Quality:*\n\n${movieInfo.downloads.map((dl, i) => {
                            const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
                            const qualityIcon = dl.quality.includes('1080') ? '🔥' : dl.quality.includes('720') ? '💎' : '📱';
                            return `*${num}* ➜ ${qualityIcon} _${dl.quality}_\n`;
                        }).join('')}\n*💬 REPLY TO DOWNLOAD 💬*\n📌 _Reply with the number_${DEFAULT_FOOTER}`;

                        const downloadOptionsMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                        const optionsMsgID = downloadOptionsMsg.key.id;

                        const handleDownload = async ({ messages: downloadMessages }) => {
                            const downloadMek = downloadMessages[0];
                            if (!downloadMek?.message) return;

                            const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                            const isReplyToOptionsMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === optionsMsgID;

                            if (isReplyToOptionsMsg && sender === downloadMek.key.remoteJid) {
                                const choiceNum = parseInt(downloadChoice) - 1;
                                
                                if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= movieInfo.downloads.length) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${movieInfo.downloads.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                    return;
                                }

                                const selectedDownload = movieInfo.downloads[choiceNum];
                                await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                try {
                                    const finalDirectLink = selectedDownload.url;

                                    // 📥 Direct Link එකෙන් Stream එකක් විදිහට download කර යැවීම
                                    const fileStream = await axios({
                                        method: 'get',
                                        url: finalDirectLink,
                                        responseType: 'stream',
                                        headers: { 'User-Agent': 'Mozilla/5.0' }
                                    });

                                    await socket.sendMessage(sender, {
                                        document: fileStream.data,
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} - ${selectedDownload.quality}.mp4`,
                                        caption: `*❪ MOVIE ❫*\n\n🎭 *${movieInfo.title}*\n📌 *Quality:* _${selectedDownload.quality}_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });

                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });

                                } catch (downloadError) {
                                    console.error('Download link error:', downloadError);
                                    await socket.sendMessage(sender, {
                                        text: `*❪ ERROR ❫*\n\n❌ *Download Failed!*\n🚫 _${downloadError.message}_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                } finally {
                                    socket.ev.off('messages.upsert', handleDownload);
                                    socket.ev.off('messages.upsert', handleSelection);
                                }
                            }
                        };

                        socket.ev.on('messages.upsert', handleDownload);

                    } catch (detailsError) {
                        console.error('Details error:', detailsError);
                        await socket.sendMessage(sender, {
                            text: `*❪ ERROR ❫*\n\n❌ *Movie Details Error!*\n🚫 _${detailsError.message}_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Cinesubz command error:', error);
        await socket.sendMessage(sender, {
            text: `*❪ SYSTEM ERROR ❫*\n\n❌ *System Error!*\n🚫 _${error.message || 'Unknown error'}_\n\n🔄 _Please try again later..._${DEFAULT_FOOTER}`
        }, { quoted: msg });
    }
});
