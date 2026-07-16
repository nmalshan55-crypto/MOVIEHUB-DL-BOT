const { cmd } = require('../command');
const axios = require('axios');



cmd({
    pattern: "cineru",
    alias: ["cinerutv"],
    desc: "Search and download movies or TV shows from Cineru",
    category: "download",
    react: "🎥",
    
},
async (socket, msg, m, { from, args }) => {
    const sender = from;
    const DEFAULT_FOOTER = `\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `*❪ ERROR ❫*\n\n⚠️ *Invalid Usage!*\n\n🎬 *Example:*
• .cineru pushpa
• .cinerutv lucifer\n\n📝 _Please provide the Movie_ _or TV Series name!_${DEFAULT_FOOTER}`
        }, { quoted: msg });
        break;
    }

    const query = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `*❪ SEARCHING ❫*\n\n🔍 *Searching Cineru...*\n⚡ _Please wait a moment._`
    });

    const API_BASE = "https://chama-movie-api.koyeb.app";
    const API_KEY = "chama_api_b3aa7aedc781b88f642bc05d6b5558a1"; // ඔබේ API Key එක දාන්න
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";

    try {
        const searchResponse = await axios.get(`${API_BASE}/api/v1/movie/cineru/search?q=${encodeURIComponent(query)}&api_key=${API_KEY}`);
        const searchData = searchResponse.data;

        if (!searchData.status || !searchData.data || searchData.data.length === 0) {
            await socket.sendMessage(sender, {
                text: `*❪ NO RESULTS ❫*\n\n😞 *No Results Found!*\n\n🎬 *Query:* _${query}_\n💡 *Tip:* _Please check the spelling and try again!_${DEFAULT_FOOTER}`
            }, { quoted: msg });
            break;
        }

        const results = searchData.data.slice(0, 25);
        let listText = `*❪ SEARCH RESULTS ❫*\n\n🎯 *Query:* _${query}_\n📊 *Results:* _${results.length} Items_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

        results.forEach((item, index) => {
            const typeIcon = item.type === 'tvshows' ? '📺' : '🎥';
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `*${num}* ➜ ${typeIcon} _${item.title.substring(0, 30)}_\n`;
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
                if (isNaN(choice) || choice < 0 || choice >= results.length) {
                    await socket.sendMessage(sender, {
                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${results.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                    }, { quoted: replyMek });
                    return;
                }

                const selectedItem = results[choice];
                const isTvShow = selectedItem.type === 'tvshows';
                
                if (isTvShow) {
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n📺 *Fetching TV Series...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/v1/movie/cineru/tv/info?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;

                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }

                        const tvInfo = tvShowData.data;
                        
                        let tvDetailsText = `*❪ TV SERIES DETAILS ❫*\n\n📺 *${tvInfo.title}*\n⭐ 𝗜ᴍᴅʙ ➜ ★ ${tvInfo.rating || 'N/A'}\n📅 𝗬ᴇᴀʀ ➜ ${tvInfo.year || 'N/A'}\n⏳  ➜ ${tvInfo.duration || 'N/A'}\n🌍 ➜ ${tvInfo.country || 'N/A'}\n🎭  ➜ ${tvInfo.genres ? tvInfo.genres.join(', ') : 'N/A'}\n🎬  ➜ ${tvInfo.director || 'N/A'}\n⭐ 𝗦ᴛᴀʀ𝘀: ${tvInfo.stars || 'N/A'}\n📝  ➜ ${tvInfo.story ? (tvInfo.story.length > 250 ? tvInfo.story.substring(0, 250) + '...' : tvInfo.story) : 'N/A'}\n🗿 ➜ cineru.lk\n${DEFAULT_FOOTER}`;

                        const posterUrl = tvInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: posterUrl },
                            caption: tvDetailsText
                        }, { quoted: replyMek });

                        // AUTO DOWNLOAD ALL EPISODES
                        await socket.sendMessage(sender, { 
                            text: `*❪ DOWNLOAD EPISODES ❫*\n\n📺 *Series:* _${tvInfo.title}_\n🎬 *Episodes:* _${tvInfo.episodes.length}_\n⚡ _Starting download process..._${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        let successCount = 0;
                        let failCount = 0;

                        for (let i = 0; i < tvInfo.episodes.length; i++) {
                            const episode = tvInfo.episodes[i];
                            try {
                                await socket.sendMessage(sender, { 
                                    text: `*❪ DOWNLOADING ❫*\n\n🎥 *Episode:* _${episode.episode_name}_\n📊 *Progress:* _${i + 1}/${tvInfo.episodes.length}_`
                                }, { quoted: replyMek });

                                const epDlRes = await axios.get(`${API_BASE}/api/v1/movie/cineru/tv/dl?q=${encodeURIComponent(episode.episode_url)}&api_key=${API_KEY}`);
                                const epDlData = epDlRes.data;

                                if (epDlData.status && epDlData.data && epDlData.data.length > 0) {
                                    const nonTelegramLinks = epDlData.data.filter(link => 
                                        link.link && !link.link.includes('t.me') && !link.link.includes('telegram')
                                    );
                                    const finalLinkObj = nonTelegramLinks[0] || epDlData.data[0];
                                    
                                    await socket.sendMessage(sender, {
                                        document: { url: finalLinkObj.link },
                                        mimetype: 'video/mp4',
                                        fileName: `${tvInfo.title} - ${episode.episode_name}.mp4`,
                                        caption: `*❪ MOVIE ❫*\n\n🎭 *${tvInfo.title}*\n📌 *${episode.episode_name}*${DEFAULT_FOOTER}`
                                    }, { quoted: replyMek });
                                    
                                    successCount++;
                                } else {
                                    failCount++;
                                }
                                
                                await new Promise(resolve => setTimeout(resolve, 2500));
                                
                            } catch (epError) {
                                console.error(`Error downloading episode:`, epError);
                                failCount++;
                            }
                        }
                        
                        await socket.sendMessage(sender, { 
                            text: `*❪ SUMMARY ❫*\n\n🎉 *Download Complete!*\n\n🎬 *Series:* _${tvInfo.title}_\n✅ *Success:* _${successCount} Episodes_\n❌ *Failed:* _${failCount} Episodes_${DEFAULT_FOOTER}`
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
                    // MOVIE FLOW
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n🎬 *Fetching Movie...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const detailsResponse = await axios.get(`${API_BASE}/api/v1/movie/cineru/infodl?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const detailsData = detailsResponse.data;

                        if (!detailsData.status || !detailsData.data) {
                            throw new Error('Failed to fetch details');
                        }

                        const movieInfo = detailsData.data;
                        const validDownloads = movieInfo.downloads || [];
                        
                        if (validDownloads.length === 0) {
                            await socket.sendMessage(sender, {
                                text: `*❪ NO DOWNLOADS ❫*\n\n⚠️ *No Downloads Found!*\n😞 _There are no downloads available for this movie!_${DEFAULT_FOOTER}`
                            }, { quoted: replyMek });
                            return;
                        }
                        
                        const movieDetailsText = `*❪ MOVIE DETAILS ❫*\n\n🎬 *${movieInfo.title}*\n⭐ 𝗜𝗠𝗗𝗕 ➜ ★ ${movieInfo.imdb || movieInfo.rating || 'N/A'}\n📅 𝗬𝗲𝗮𝗿 ➜ ${movieInfo.year || 'N/A'}\n⏳ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻 ➜ ${movieInfo.duration || 'N/A'}\n🌍 𝗖ᴏᴜɴ𝘁𝗿ʏ ➜ ${movieInfo.country || 'N/A'}\n🎭  ➜ ${movieInfo.genres ? movieInfo.genres.join(', ') : 'N/A'}\n🏷️  ➜ ${movieInfo.language || 'N/A'}\n🎬  ➜ ${movieInfo.director || 'N/A'}\n⭐  ➜ ${movieInfo.stars || 'N/A'}\n📝  ➜ ${movieInfo.story ? (movieInfo.story.length > 250 ? movieInfo.story.substring(0, 250) + '...' : movieInfo.story) : 'N/A'}\n🗿 ➜ cineru.lk\n${DEFAULT_FOOTER}`;

                        const moviePosterUrl = movieInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: moviePosterUrl },
                            caption: movieDetailsText
                        }, { quoted: replyMek });

                        const downloadOptionsText = `*❪ DOWNLOADS ❫*\n\n📥 *Select Quality:*\n\n${validDownloads.map((dl, i) => {
    const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;
    const qualityIcon = dl.quality.includes('1080') ? '🔥' : dl.quality.includes('720') ? '💎' : '📱';
    return `*${num}* ➜ ${qualityIcon} _${dl.quality}_ 💾 _${dl.size || 'N/A'}_`;
}).join('\n')}\n\n*💬 REPLY TO DOWNLOAD 💬*\n📌 _Reply with the number_${DEFAULT_FOOTER}`;

                        const downloadOptionsMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                        const optionsMsgID = downloadOptionsMsg.key.id;

                        const handleDownload = async ({ messages: downloadMessages }) => {
                            const downloadMek = downloadMessages[0];
                            if (!downloadMek?.message) return;

                            const downloadChoice = downloadMek.message.conversation || downloadMek.message.extendedTextMessage?.text;
                            const isReplyToOptionsMsg = downloadMek.message.extendedTextMessage?.contextInfo?.stanzaId === optionsMsgID;

                            if (isReplyToOptionsMsg && sender === downloadMek.key.remoteJid) {
                                const choiceNum = parseInt(downloadChoice) - 1;
                                
                                if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= validDownloads.length) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${validDownloads.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                    return;
                                }

                                const selectedDownload = validDownloads[choiceNum];
                                await socket.sendMessage(sender, { react: { text: '📥', key: downloadMek.key } });

                                try {
                                    const finalDirectLink = selectedDownload.link;

                                    await socket.sendMessage(sender, {
                                        document: { url: finalDirectLink },
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} - ${selectedDownload.quality}.mp4`,
                                        caption: `*❪ MOVIE ❫*\n\n🎭 *${movieInfo.title}*\n📌 *Quality:* _${selectedDownload.quality}_\n💾 *Size:* _${selectedDownload.size}_${DEFAULT_FOOTER}`
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
        console.error('Cineru command error:', error);
        await socket.sendMessage(sender, {
            text: `*❪ SYSTEM ERROR ❫*\n\n❌ *System Error!*\n🚫 _${error.message || 'Unknown error'}_\n\n🔄 _Please try again later..._${DEFAULT_FOOTER}`
        }, { quoted: msg });
    }
});
