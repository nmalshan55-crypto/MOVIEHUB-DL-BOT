const { cmd } = require('../command');
const axios = require('axios');



cmd({
    pattern: "moviebox",
    alias: ["movieboxdl,moviepro"],
    desc: "Search and download movies or TV shows from MovieBox",
    category: "download",
    react: "🍿",
    
},
async (socket, msg, m, { from, args }) => {
    const sender = from;
    if (!args.length) {
        await socket.sendMessage(sender, {
            text: '❌ *ERROR*\n\n*🛑 සෙවිය යුතු සිනමාපටය හෝ ටීවී කතාමාලාවේ නම ලබාදෙන්න! උදා: .moviebox avatar*'
        }, { quoted: msg });
        return;
    }
    const movieboxQuery = args.join(' ');
    await socket.sendMessage(sender, { text: '🔍 *Searching on MovieBox...*' });
    
    const API_BASE = "https://chama-movie-api.koyeb.app";
    const API_KEY = "chama_api_b3aa7aedc781b88f642bc05d6b5558a1"; // ඔබගේ API Key එක යොදන්න
    const DEFAULT_FOOTER = "✨ *Powered by Moviehub-DL*";
    const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500";
    
    try {
        const searchResponse = await axios.get(`${API_BASE}/api/v1/movie/moviebox/search?q=${encodeURIComponent(movieboxQuery)}&api_key=${API_KEY}`);
        const searchData = searchResponse.data;
        if (!searchData.status || !searchData.data || searchData.data.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ *NO RESULTS*\n\n*MovieBox හි සෙවූ නමින් කිසිවක් හමුවූයේ නැත! 🛑*'
            }, { quoted: msg });
            return;
        }
        const movieboxResults = searchData.data.slice(0, 25);
        let listText = `🎬 *MOVIEBOX - SEARCH RESULTS*\n\n*Query:* ${movieboxQuery}\n*Results Found:* ${movieboxResults.length}\n\n*Reply with number to select:*\n\n`;
        movieboxResults.forEach((item, index) => {
            const type = item.type === 'tvshows' ? '📺 TV Series' : '🎥 Movie';
            listText += `${index + 1}. ${type} | ${item.title}\n`;
        });
        listText += `\n${DEFAULT_FOOTER}`;
        
        const sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        const messageID = sentMsg.key.id;
        
        const handleSelection = async ({ messages: replyMessages }) => {
            const replyMek = replyMessages[0];
            if (!replyMek?.message) return;
            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;
            
            if (isReplyToSentMsg && sender === replyMek.key.remoteJid) {
                const choice = parseInt(messageType) - 1;
                if (isNaN(choice) || choice < 0 || choice >= movieboxResults.length) {
                    await socket.sendMessage(sender, {
                        text: `⚠️ *INVALID SELECTION*\n\n*වැරදි අංකයක්! කරුණාකර 1-${movieboxResults.length} අතර අංකයක් ලබාදෙන්න! 🛑*`
                    }, { quoted: replyMek });
                    return;
                }
                const selectedItem = movieboxResults[choice];
                const isTvShow = selectedItem.type === 'tvshows';
                
                if (isTvShow) {
                    await socket.sendMessage(sender, { 
                        text: '⏳ *Fetching TV Series Details & Starting Download...*' 
                    }, { quoted: replyMek });
                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/v1/movie/moviebox/tv/info?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;
                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }
                        const tvInfo = tvShowData.data;
                        
                        let tvDetailsText = 
`📺 *[ TV SERIES DETAILS ]*
🖼️ *Title:* ${tvInfo.title}
⭐ *IMDB:* ${tvInfo.rating || 'N/A'}
📅 *Year:* ${tvInfo.year || 'N/A'}
🕒 *Runtime:* ${tvInfo.duration || 'N/A'}
🌍 *Country:* ${tvInfo.country || 'N/A'}
✍️ *Story/Cast:*
Director: ${tvInfo.directors || 'N/A'}
Stars: ${tvInfo.stars || 'N/A'}

💡 *Sinhala AI Sub Available!*`;
                        
                        const posterUrl = tvInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: posterUrl },
                            caption: tvDetailsText
                        }, { quoted: replyMek });
                        
                        const seasons = tvInfo.seasons || [];
                        if (seasons.length === 0) {
                            throw new Error('No seasons found for this TV Series');
                        }
                        
                        const activeSeason = seasons[0];
                        await socket.sendMessage(sender, { 
                            text: `📥 *Starting automatic download of Season ${activeSeason.season} (${activeSeason.episodes.length} episodes) consecutively...*\n\n⚡ *This may take some time* ⚡` 
                        }, { quoted: replyMek });
                        
                        let successCount = 0;
                        let failCount = 0;
                        for (let i = 0; i < activeSeason.episodes.length; i++) {
                            const epNum = activeSeason.episodes[i];
                            try {
                                await socket.sendMessage(sender, { 
                                    text: `📥 *Downloading:* Episode ${epNum}...` 
                                }, { quoted: replyMek });
                                
                                const epDlRes = await axios.get(`${API_BASE}/api/v1/movie/moviebox/tv/dl?q=${encodeURIComponent(selectedItem.link)}&se=${activeSeason.season}&ep=${epNum}&api_key=${API_KEY}`);
                                const epDlData = epDlRes.data;
                                
                                if (epDlData.status && epDlData.data && epDlData.data.length > 0) {
                                    const videoLinks = epDlData.data.filter(dl => dl.quality !== 'SUB');
                                    const subLinks = epDlData.data.filter(dl => dl.quality === 'SUB');
                                    const finalLinkObj = videoLinks[0] || epDlData.data[0];
                                    
                                    await socket.sendMessage(sender, {
                                        document: { url: finalLinkObj.link || finalLinkObj.url },
                                        mimetype: 'video/mp4',
                                        fileName: `${tvInfo.title} - S${activeSeason.season}E${epNum}.mp4`,
                                        caption: `${tvInfo.title}\n\n*Episode:* S${activeSeason.season}E${epNum}${DEFAULT_FOOTER}`
                                    }, { quoted: replyMek });
                                    
                                    // Send English and Sinhala subtitles if available
                                    const englishSub = subLinks.find(s => s.title.toLowerCase().includes('english') || s.title.toLowerCase().includes('en'));
                                    const sinhalaSub = subLinks.find(s => s.title.toLowerCase().includes('sinhala') || s.title.toLowerCase().includes('si'));
                                    const subsToSend = [];
                                    if (sinhalaSub) subsToSend.push(sinhalaSub);
                                    if (englishSub) subsToSend.push(englishSub);
                                    if (subsToSend.length === 0 && subLinks.length > 0) {
                                        subsToSend.push(subLinks[0]);
                                    }
                                    
                                    for (const sub of subsToSend) {
                                        try {
                                            const subLang = sub.title.replace('Subtitle - ', '').replace(` (S${activeSeason.season}E${epNum})`, '').trim();
                                            await socket.sendMessage(sender, {
                                                document: { url: sub.link || sub.url },
                                                mimetype: 'text/plain',
                                                fileName: `${tvInfo.title} - S${activeSeason.season}E${epNum} - ${subLang}.srt`,
                                                caption: `${tvInfo.title} - Subtitle\n\n*Language:* ${subLang}\n*Episode:* S${activeSeason.season}E${epNum}${DEFAULT_FOOTER}`
                                            }, { quoted: replyMek });
                                        } catch (subErr) {
                                            console.error('Error sending episode subtitle:', subErr);
                                        }
                                    }
                                    
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
                            text: `✅ *Download Complete!*\n\n*Summary:*\n📥 *Success:* ${successCount} episodes\n❌ *Failed:* ${failCount} episodes\n*Series:* ${tvInfo.title}` 
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                        
                    } catch (tvShowError) {
                        console.error('TV Show error:', tvShowError);
                        await socket.sendMessage(sender, {
                            text: `❌ *ERROR*\n\n*TV series details ලබාගැනීම අසාර්ථකයි*\n${tvShowError.message}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                    
                } else {
                    // MOVIE FLOW
                    await socket.sendMessage(sender, { 
                        text: '⏳ *Fetching Movie details...*' 
                    }, { quoted: replyMek });
                    try {
                        const detailsResponse = await axios.get(`${API_BASE}/api/v1/movie/moviebox/info?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const detailsData = detailsResponse.data;
                        if (!detailsData.status || !detailsData.data) {
                            throw new Error('Failed to fetch details');
                        }
                        const movieInfo = detailsData.data;
                        const validDownloads = movieInfo.downloads || [];
                        
                        if (validDownloads.length === 0) {
                            await socket.sendMessage(sender, {
                                text: '❌ *NO DOWNLOADS*\n\n*මෙම චිත්‍රපටය සදහා බාගත කිරීමේ links හමුවූයේ නැත!*'
                            }, { quoted: replyMek });
                            return;
                        }
                        
                        const movieDetailsText = 
`🎥 *[ MOVIE DETAILS ]*
🖼️ *Title:* ${movieInfo.title}
⭐ *IMDB:* ${movieInfo.rating || 'N/A'}/10
🕒 *Runtime:* ${movieInfo.duration || 'N/A'}
📅 *Year:* ${movieInfo.year || 'N/A'}
🌍 *Country:* ${movieInfo.country || 'N/A'}
✍️ *Story/Cast:*
Director: ${movieInfo.directors || 'N/A'}
Stars: ${movieInfo.stars || 'N/A'}

💡 *Sinhala AI Sub Available!*`;
                        
                        const moviePosterUrl = movieInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: moviePosterUrl },
                            caption: movieDetailsText
                        }, { quoted: replyMek });
                        const downloadOptionsText = 
`📥 *DOWNLOAD OPTIONS*
${validDownloads.map((dl, i) => `${i + 1}. ${dl.quality} (${dl.size || 'N/A'})`).join('\n')}
*Reply with number to download:*
${DEFAULT_FOOTER}`;
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
                                        text: `⚠️ *INVALID SELECTION*\n\n*වැරදි අංකයක්! 1-${validDownloads.length} අතර අංකයක් තෝරන්න!*`
                                    }, { quoted: downloadMek });
                                    return;
                                }
                                const selectedDownload = validDownloads[choiceNum];
                                const isSub = selectedDownload.quality === 'SUB' || selectedDownload.title?.toLowerCase().includes('subtitle') || (selectedDownload.quality && selectedDownload.quality.toLowerCase().includes('sub'));
                                const mimeType = isSub ? 'text/plain' : 'video/mp4';
                                const fileName = isSub ? `${movieInfo.title} - Subtitle.srt` : `${movieInfo.title} - ${selectedDownload.quality}.mp4`;
                                
                                await socket.sendMessage(sender, { react: { text: '⏳', key: downloadMek.key } });
                                try {
                                    const finalDirectLink = selectedDownload.link || selectedDownload.url;
                                    await socket.sendMessage(sender, {
                                        document: { url: finalDirectLink },
                                        mimetype: mimeType,
                                        fileName: fileName,
                                        caption: isSub ? `${movieInfo.title} - Subtitle\n\n*Type:* Subtitle\n*Size:* ${selectedDownload.size || 'N/A'}\n\n${DEFAULT_FOOTER}` : `${movieInfo.title}\n\n*Quality:* ${selectedDownload.quality}\n*Size:* ${selectedDownload.size}\n\n${DEFAULT_FOOTER}`
                                    }, { quoted: downloadMek });
                                    await socket.sendMessage(sender, { react: { text: '✅', key: downloadMek.key } });
                                } catch (downloadError) {
                                    console.error('Download link error:', downloadError);
                                    await socket.sendMessage(sender, {
                                        text: `❌ *DOWNLOAD ERROR*\n\n*බාගත කිරීම අසාර්ථක විය!*\n${downloadError.message}`
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
                            text: `❌ *ERROR*\n\n*Details ලබාගැනීම අසාර්ථකයි*\n${detailsError.message}`
                        }, { quoted: replyMek });
                        socket.ev.off('messages.upsert', handleSelection);
                    }
                }
            }
        };
        socket.ev.on('messages.upsert', handleSelection);
    } catch (error) {
        console.error('Moviebox command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *ERROR*\n\n*සර්වර් දෝෂයකි:* ${error.message || 'Unknown error'}`
        }, { quoted: msg });
    }
});
