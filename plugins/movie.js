const { cmd } = require('../command');
const axios = require('axios');



cmd({
    pattern: "movie",
    alias: ["mᴠ"],
    desc: "Unified search and download movies/series from all sources",
    category: "download",
    react: "🎥",
    
},
async (socket, msg, m, { from, args }) => {
    const sender = from;
    const DEFAULT_FOOTER = `\n\n> 🧬 ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴏᴠɪᴇʜᴜʙ-ᴅʟ`;

    if (!args.length) {
        await socket.sendMessage(sender, {
            text: `*❪ ERROR ❫*\n\n⚠️ *Invalid Usage!*\n\n🎬 *Example:*\n• .movie avatar\n• .mv game of thrones\n\n📝 _Please provide the Movie_ _or TV Series name!_${DEFAULT_FOOTER}`
        }, { quoted: msg });
        return;
    }

    const query = args.join(' ');
    await socket.sendMessage(sender, { 
        text: `*❪ SEARCHING ❫*\n\n🔍 *Searching across all sources...*\n⚡ _Please wait a moment._`
    });

    const API_BASE = "https://chama-movie-api.koyeb.app";
    const API_KEY = "chama_api_b3aa7aedc781b88f642bc05d6b5558a1"; // ඔබේ API Key එක දාන්න
    const DEFAULT_IMAGE = "https://chama-movie-api.koyeb.app/logo.png";

    try {
        const sites = ["cinesubz", "sinhalasub", "thenkiri", "moviesublk", "baiscope", "cineru"];
        const promises = sites.map(site => 
            axios.get(`${API_BASE}/api/v1/movie/${site}/search?q=${encodeURIComponent(query)}&api_key=${API_KEY}`)
                .then(res => res.data.status && res.data.data ? res.data.data.map(item => ({ ...item, site })) : [])
                .catch(() => [])
        );

        const resultsArrays = await Promise.all(promises);
        const results = resultsArrays.flat().slice(0, 40);

        if (results.length === 0) {
            await socket.sendMessage(sender, {
                text: `*❪ NO RESULTS ❫*\n\n😞 *No Results Found!*\n\n🎬 *Query:* _${query}_\n💡 *Tip:* _Please check the spelling and try again!_${DEFAULT_FOOTER}`
            }, { quoted: msg });
            return;
        }

        let listText = `*❪ MULTI-SOURCE SEARCH RESULTS ❫*\n\n🎯 *Query:* _${query}_\n📊 *Results:* _	ext ${results.length} Items_\n\n*👇 SELECT A NUMBER 👇*\n\n`;

        results.forEach((item, index) => {
            const siteTag = item.site.toUpperCase();
            const typeIcon = item.type === 'tvshows' ? '📺' : '🎥';
            const num = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
            listText += `*${num}* ➜ ${typeIcon} [_${siteTag}_] _${item.title.substring(0, 40)}_\n`;
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
                const site = selectedItem.site;
                const isTvShow = selectedItem.type === 'tvshows';
                
                if (isTvShow) {
                    await socket.sendMessage(sender, { 
                        text: `*❪ FETCHING ❫*\n\n📺 *Fetching TV Series details from ${site.toUpperCase()}...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/v1/movie/${site}/tv/info?q=	ext ${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;

                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }

                        const tvInfo = tvShowData.data;
                        
                        let tvDetailsText = `*❪ TV SERIES DETAILS ❫*\n\n📺 *${tvInfo.title}*\n⭐ 𝗜ᴍᴅ𝗯 ➜ ★ ${tvInfo.rating || 'N/A'}\n📅 𝗬ᴇᴀʀ ➜ ${tvInfo.year || 'N/A'}\n⏳ 奠🔋 ➜ ${tvInfo.duration || 'N/A'}\n🌍 🇨🇴🇺🇳🇹🇷🇾 ➜ ${tvInfo.country || 'N/A'}\n🎭 🇬𝗲𝗻𝗿𝗲𝘀 ➜ ${tvInfo.genres ? tvInfo.genres.join(', ') : 'N/A'}\n📝 𝗦𝘁𝗼𝗿𝘆 ➜ ${tvInfo.story ? (tvInfo.story.length > 250 ? tvInfo.story.substring(0, 250) + '...' : tvInfo.story) : 'N/A'}\n🗿 𝗦𝗼𝘂𝗿𝗰𝗲 ➜ ${site.toUpperCase()}\n ${DEFAULT_FOOTER}`;

                        const posterUrl = tvInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: posterUrl },
                            caption: tvDetailsText
                        }, { quoted: replyMek });

                        // AUTO DOWNLOAD ALL EPISODES
                        await socket.sendMessage(sender, { 
                            text: `*❪ DOWNLOAD EPISODES ❫*\n\n📺 *Series:* _${tvInfo.title}_
🎬 *Episodes:* _${tvInfo.episodes.length}_
⚡ _Starting download process..._${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });

                        let successCount = 0;
                        let failCount = 0;

                        for (let i = 0; i < tvInfo.episodes.length; i++) {
                            const episode = tvInfo.episodes[i];
                            try {
                                await socket.sendMessage(sender, { 
                                    text: `*❪ DOWNLOADING ❫*\n\n🎥 *Episode:* _${episode.episode_name || episode.name || 'Episode ' + (i + 1)}_
📊 *Progress:* _${i + 1}/${tvInfo.episodes.length}_`
                                }, { quoted: replyMek });

                                const epUrl = episode.episode_url || episode.url || episode.link;
                                const epDlRes = await axios.get(`${API_BASE}/api/v1/movie/${site}/tv/dl?q=${encodeURIComponent(epUrl)}&api_key=${API_KEY}`);
                                const epDlData = epDlRes.data;

                                if (epDlData.status && epDlData.data && epDlData.data.length > 0) {
                                    const nonTelegramLinks = epDlData.data.filter(link => 
                                        link.link && !link.link.includes('t.me') && !link.link.includes('telegram')
                                    );
                                    const finalLinkObj = nonTelegramLinks[0] || epDlData.data[0];
                                    
                                    let jpegThumbnail = undefined;
                                    try {
                                        const thumbRes = await axios.get(posterUrl, { responseType: 'arraybuffer' });
                                        jpegThumbnail = Buffer.from(thumbRes.data).toString('base64');
                                    } catch (err) {}

                                    await socket.sendMessage(sender, {
                                        document: { url: finalLinkObj.link },
                                        mimetype: 'video/mp4',
                                        fileName: `${tvInfo.title} - 	ext ${episode.episode_name || 'Episode ' + (i+1)}.mp4`,
                                        caption: `🎭 *Title:* ${tvInfo.title}\n📌 *Episode:* ${episode.episode_name || 'Episode ' + (i+1)}\n📊 *Quality:* Direct MP4 ${DEFAULT_FOOTER}`,
                                        jpegThumbnail: jpegThumbnail
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
                        text: `*❪ FETCHING ❫*\n\n🎬 *Fetching Movie details from ${site.toUpperCase()}...*\n⚡ _Please wait..._`
                    }, { quoted: replyMek });

                    try {
                        const detailsResponse = await axios.get(`${API_BASE}/api/v1/movie/${site}/infodl?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
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
                        
                        const movieDetailsText = `*❪ MOVIE DETAILS ❫*\n\n🎬 *${movieInfo.title}*\n⭐ 𝗜𝗠𝗗𝗕 ➜ ★ ${movieInfo.imdb || movieInfo.rating || 'N/A'}\n📅 𝗬𝗲𝗮𝗿 ➜ ${movieInfo.year || 'N/A'}\n⏳ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻 ➜ ${movieInfo.duration || 'N/A'}\n🌍 🇨🇴🇺🇳🇹🇷🇾 ➜ ${movieInfo.country || 'N/A'}\n🎭 🇬𝗲𝗻𝗿𝗲𝘀 ➜ ${movieInfo.genres ? movieInfo.genres.join(', ') : 'N/A'}\n🏷️ 𝗟𝗮𝗻𝗴 ➜ 	ext ${movieInfo.language || movieInfo.tag || 'N/A'}\n🎬 𝗗𝗶𝗿𝗲𝗰𝘁𝗼𝗿 ➜ ${movieInfo.directors || movieInfo.director || 'N/A'}\n⭐ 𝗖𝗮𝘀𝘁 ➜ ${movieInfo.stars || 'N/A'}\n📝 𝗦𝘁𝗼𝗿𝘆 ➜ ${movieInfo.story ? (movieInfo.story.length > 250 ? movieInfo.story.substring(0, 250) + '...' : movieInfo.story) : 'N/A'}\n🗿 𝗦𝗼𝘂𝗿𝗰𝗲 ➜ ${site.toUpperCase()}\n ${DEFAULT_FOOTER}`;

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

                        const dlSentMsg = await socket.sendMessage(sender, { text: downloadOptionsText }, { quoted: replyMek });
                        const dlMessageID = dlSentMsg.key.id;

                        const handleDownloadSelection = async ({ messages: dlReplyMessages }) => {
                            const dlReplyMek = dlReplyMessages[0];
                            if (!dlReplyMek?.message) return;

                            const dlChoiceText = dlReplyMek.message.conversation || dlReplyMek.message.extendedTextMessage?.text;
                            const isReplyToDlMsg = dlReplyMek.message.extendedTextMessage?.contextInfo?.stanzaId === dlMessageID;

                            if (isReplyToDlMsg && sender === dlReplyMek.key.remoteJid) {
                                const dlChoice = parseInt(dlChoiceText) - 1;
                                if (isNaN(dlChoice) || dlChoice < 0 || dlChoice >= validDownloads.length) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ INVALID ❫*\n\n⚠️ *Wrong Number!*\n🎯 *Range:* _01 - ${validDownloads.length}_\n📝 _Please reply with a valid number!_${DEFAULT_FOOTER}`
                                    }, { quoted: dlReplyMek });
                                    return;
                                }

                                const selectedDownload = validDownloads[dlChoice];
                                
                                await socket.sendMessage(sender, { 
                                    text: `*❪ SENDING MOVIE ❫*\n\n📥 *Sending:* _${movieInfo.title}_
📊 *Quality:* _${selectedDownload.quality}_
💾 *Size:* _${selectedDownload.size || 'N/A'}_
⚡ _Uploading file to WhatsApp..._`
                                }, { quoted: dlReplyMek });

                                try {
                                    let jpegThumbnail = undefined;
                                    try {
                                        const thumbRes = await axios.get(moviePosterUrl, { responseType: 'arraybuffer' });
                                        jpegThumbnail = Buffer.from(thumbRes.data).toString('base64');
                                    } catch (err) {}

                                    await socket.sendMessage(sender, {
                                        document: { url: selectedDownload.link },
                                        mimetype: 'video/mp4',
                                        fileName: `${movieInfo.title} (${selectedDownload.quality}).mp4`,
                                        caption: `🎭 *Title:* ${movieInfo.title}\n🌟 *IMDB:* ${movieInfo.imdb || movieInfo.rating || 'N/A'}\n📅 *Year:* ${movieInfo.year || 'N/A'}\n📊 *Quality:* ${selectedDownload.quality}\n💾 *Size:* ${selectedDownload.size || 'N/A'} ${DEFAULT_FOOTER}`,
                                        jpegThumbnail: jpegThumbnail
                                    }, { quoted: dlReplyMek });
                                } catch (uploadErr) {
                                    await socket.sendMessage(sender, {
                                        text: `*❪ UPLOAD FAILED ❫*\n\n❌ *Failed to upload file directly!*\n🔗 *Direct Link:* ${selectedDownload.link}${DEFAULT_FOOTER}`
                                    }, { quoted: dlReplyMek });
                                }

                                socket.ev.off('messages.upsert', handleDownloadSelection);
                            }
                        };

                        socket.ev.on('messages.upsert', handleDownloadSelection);
                        socket.ev.off('messages.upsert', handleSelection);

                    } catch (movieDetailsError) {
                        console.error('Movie Details error:', movieDetailsError);
                        await socket.sendMessage(sender, {
                            text: `*❪ ERROR ❫*\n\n❌ *Movie Details Error!*\n🚫 _${movieDetailsError.message}_${DEFAULT_FOOTER}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                }
            }
        };

        socket.ev.on('messages.upsert', handleSelection);

    } catch (error) {
        console.error('Unified Movie search error:', error);
        await socket.sendMessage(sender, {
            text: `*❪ SYSTEM ERROR ❫*\n\n❌ *System Error!*\n🚫 _${error.message || 'Unknown error'}_\n\n🔄 _Please try again later..._${DEFAULT_FOOTER}`
        }, { quoted: msg });
    }
});
