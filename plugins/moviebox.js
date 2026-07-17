const { cmd } = require('../command');
const axios = require('axios');

// Tries several possible field names since the API isn't publicly documented.
function pickJoin(obj, keys, fallback = 'N/A') {
    for (const k of keys) {
        const v = obj && obj[k];
        if (Array.isArray(v) && v.length) return v.join(', ');
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return fallback;
}

const LANG_MAP = { en: 'English', si: 'Sinhala', ta: 'Tamil', hi: 'Hindi', es: 'Spanish', fr: 'French', ar: 'Arabic', zh: 'Chinese', ko: 'Korean', ja: 'Japanese', de: 'German', pt: 'Portuguese', ru: 'Russian' };

function matchesLang(sub, keywords) {
    const raw = (sub.language || sub.lang || sub.code || sub.name || sub.label || sub.title || '').toString().toLowerCase();
    return keywords.some(k => raw === k || raw.includes(k));
}

function detectSubLabel(sub, index) {
    const raw = (sub.language || sub.lang || sub.code || sub.name || sub.label || sub.title || '').toString().trim();
    const lower = raw.toLowerCase();
    for (const code in LANG_MAP) {
        if (lower === code || lower.includes(LANG_MAP[code].toLowerCase())) {
            return `${LANG_MAP[code]} (${code.toUpperCase()})`;
        }
    }
    if (raw && raw.toUpperCase() !== 'SUB') return raw;
    return `Subtitle ${index + 1}`;
}

// Parses "1,3,5", "1-5", "all", or a single number into a list of indices (0-based).
function parseEpisodeSelection(input, max) {
    const trimmed = input.trim().toLowerCase();
    if (trimmed === 'all') return Array.from({ length: max }, (_, i) => i);
    const indices = new Set();
    for (const part of trimmed.split(',')) {
        const p = part.trim();
        if (!p) continue;
        if (p.includes('-')) {
            const [a, b] = p.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(a) && !isNaN(b)) {
                for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
                    if (i >= 1 && i <= max) indices.add(i - 1);
                }
            }
        } else {
            const n = parseInt(p, 10);
            if (!isNaN(n) && n >= 1 && n <= max) indices.add(n - 1);
        }
    }
    return Array.from(indices).sort((a, b) => a - b);
}

async function downloadEpisode(socket, sender, replyMek, API_BASE, API_KEY, selectedItem, tvInfo, seasonNum, epNum, DEFAULT_FOOTER) {
    const epDlRes = await axios.get(`${API_BASE}/api/v1/movie/moviebox/tv/dl?q=${encodeURIComponent(selectedItem.link)}&se=${seasonNum}&ep=${epNum}&api_key=${API_KEY}`);
    const epDlData = epDlRes.data;

    if (!epDlData.status || !epDlData.data || epDlData.data.length === 0) {
        return false;
    }

    const videoLinks = epDlData.data.filter(dl => dl.quality !== 'SUB');
    const subLinks = epDlData.data.filter(dl => dl.quality === 'SUB');
    const finalLinkObj = videoLinks[0] || epDlData.data[0];

    await socket.sendMessage(sender, {
        document: { url: finalLinkObj.link || finalLinkObj.url },
        mimetype: 'video/mp4',
        fileName: `${tvInfo.title} - S${seasonNum}E${epNum}.mp4`,
        caption: `${tvInfo.title}\n\n*Episode:* S${seasonNum}E${epNum}\n${DEFAULT_FOOTER}`
    }, { quoted: replyMek });

    // Prefer English + Sinhala specifically; if neither can be confidently detected, send everything available with clear labels instead of dropping them.
    const englishSub = subLinks.find(s => matchesLang(s, ['en', 'eng', 'english']));
    const sinhalaSub = subLinks.find(s => matchesLang(s, ['si', 'sin', 'sinhala']));
    let subsToSend = [];
    if (englishSub) subsToSend.push({ sub: englishSub, label: 'English (EN)' });
    if (sinhalaSub) subsToSend.push({ sub: sinhalaSub, label: 'Sinhala (SI) - AI Translated' });
    if (subsToSend.length === 0 && subLinks.length > 0) {
        subsToSend = subLinks.map((s, i) => ({ sub: s, label: detectSubLabel(s, i) }));
    }

    for (const { sub, label } of subsToSend) {
        try {
            await socket.sendMessage(sender, {
                document: { url: sub.link || sub.url },
                mimetype: 'text/plain',
                fileName: `${tvInfo.title} - S${seasonNum}E${epNum} - ${label}.srt`,
                caption: `${tvInfo.title} - Subtitle\n\n*Language:* ${label}\n*Episode:* S${seasonNum}E${epNum}\n${DEFAULT_FOOTER}`
            }, { quoted: replyMek });
        } catch (subErr) {
            console.error('Error sending episode subtitle:', subErr);
        }
    }

    return true;
}

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
                        text: '⏳ *Fetching TV Series Details...*'
                    }, { quoted: replyMek });
                    try {
                        const tvShowResponse = await axios.get(`${API_BASE}/api/v1/movie/moviebox/tv/info?q=${encodeURIComponent(selectedItem.link)}&api_key=${API_KEY}`);
                        const tvShowData = tvShowResponse.data;
                        if (!tvShowData.status || !tvShowData.data) {
                            throw new Error('Failed to fetch TV show details');
                        }
                        const tvInfo = tvShowData.data;

                        const rating = pickJoin(tvInfo, ['rating', 'imdb', 'imdb_rating', 'imdbRating', 'rate', 'score']);
                        const duration = pickJoin(tvInfo, ['duration', 'runtime', 'length', 'time']);
                        const country = pickJoin(tvInfo, ['country', 'countries', 'region', 'nation', 'origin']);
                        const directors = pickJoin(tvInfo, ['directors', 'director']);
                        const stars = pickJoin(tvInfo, ['stars', 'cast', 'actors', 'casts']);

                        let tvDetailsText =
`📺 *[ TV SERIES DETAILS ]*
🖼️ *Title:* ${tvInfo.title}
⭐ *IMDB:* ${rating}
📅 *Year:* ${pickJoin(tvInfo, ['year', 'release_year', 'releaseYear'])}
🕒 *Runtime:* ${duration}
🌍 *Country:* ${country}
✍️ *Story/Cast:*
Director: ${directors}
Stars: ${stars}

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

                        let seasonListText = `📺 *SELECT SEASON*\n\n`;
                        seasons.forEach((s, i) => {
                            seasonListText += `${i + 1}. Season ${s.season} (${s.episodes.length} episodes)\n`;
                        });
                        seasonListText += `\n*Reply with the season number:*\n${DEFAULT_FOOTER}`;
                        const seasonMsg = await socket.sendMessage(sender, { text: seasonListText }, { quoted: replyMek });
                        const seasonMsgID = seasonMsg.key.id;

                        const handleSeasonSelection = async ({ messages: seasonMessages }) => {
                            const seasonMek = seasonMessages[0];
                            if (!seasonMek?.message) return;
                            const seasonReplyText = seasonMek.message.conversation || seasonMek.message.extendedTextMessage?.text;
                            const isReplyToSeasonMsg = seasonMek.message.extendedTextMessage?.contextInfo?.stanzaId === seasonMsgID;
                            if (!(isReplyToSeasonMsg && sender === seasonMek.key.remoteJid)) return;

                            const seasonChoice = parseInt(seasonReplyText) - 1;
                            if (isNaN(seasonChoice) || seasonChoice < 0 || seasonChoice >= seasons.length) {
                                await socket.sendMessage(sender, {
                                    text: `⚠️ *INVALID SELECTION*\n\n*Please reply with a number between 1-${seasons.length}*`
                                }, { quoted: seasonMek });
                                return;
                            }
                            const activeSeason = seasons[seasonChoice];

                            let episodeListText = `📺 *${tvInfo.title} - Season ${activeSeason.season}*\n\n`;
                            activeSeason.episodes.forEach((epNum, i) => {
                                episodeListText += `${i + 1}. Episode ${epNum}\n`;
                            });
                            episodeListText += `\n*Reply with episode number(s):*\n• Single: 3\n• Multiple: 1,3,5\n• Range: 1-5\n• All: all\n\n${DEFAULT_FOOTER}`;
                            const episodeMsg = await socket.sendMessage(sender, { text: episodeListText }, { quoted: seasonMek });
                            const episodeMsgID = episodeMsg.key.id;

                            const handleEpisodeSelection = async ({ messages: episodeMessages }) => {
                                const episodeMek = episodeMessages[0];
                                if (!episodeMek?.message) return;
                                const episodeReplyText = episodeMek.message.conversation || episodeMek.message.extendedTextMessage?.text;
                                const isReplyToEpisodeMsg = episodeMek.message.extendedTextMessage?.contextInfo?.stanzaId === episodeMsgID;
                                if (!(isReplyToEpisodeMsg && sender === episodeMek.key.remoteJid)) return;

                                const selectedIndices = parseEpisodeSelection(episodeReplyText, activeSeason.episodes.length);
                                if (selectedIndices.length === 0) {
                                    await socket.sendMessage(sender, {
                                        text: `⚠️ *INVALID SELECTION*\n\n*Please reply with a valid episode number, list, range, or 'all'*`
                                    }, { quoted: episodeMek });
                                    return;
                                }

                                await socket.sendMessage(sender, {
                                    text: `📥 *Downloading ${selectedIndices.length} episode(s) from Season ${activeSeason.season}...*\n\n⚡ *This may take some time* ⚡`
                                }, { quoted: episodeMek });

                                let successCount = 0;
                                let failCount = 0;
                                for (const idx of selectedIndices) {
                                    const epNum = activeSeason.episodes[idx];
                                    try {
                                        await socket.sendMessage(sender, { text: `📥 *Downloading:* Episode ${epNum}...` }, { quoted: episodeMek });
                                        const ok = await downloadEpisode(socket, sender, episodeMek, API_BASE, API_KEY, selectedItem, tvInfo, activeSeason.season, epNum, DEFAULT_FOOTER);
                                        if (ok) successCount++; else failCount++;
                                        await new Promise(resolve => setTimeout(resolve, 2500));
                                    } catch (epError) {
                                        console.error('Error downloading episode:', epError);
                                        failCount++;
                                    }
                                }

                                await socket.sendMessage(sender, {
                                    text: `✅ *Download Complete!*\n\n*Summary:*\n📥 *Success:* ${successCount} episodes\n❌ *Failed:* ${failCount} episodes\n*Series:* ${tvInfo.title}`
                                }, { quoted: episodeMek });

                                socket.ev.off('messages.upsert', handleEpisodeSelection);
                                socket.ev.off('messages.upsert', handleSeasonSelection);
                                socket.ev.off('messages.upsert', handleSelection);
                            };
                            socket.ev.on('messages.upsert', handleEpisodeSelection);
                        };
                        socket.ev.on('messages.upsert', handleSeasonSelection);

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

                        const rating = pickJoin(movieInfo, ['rating', 'imdb', 'imdb_rating', 'imdbRating', 'rate', 'score']);
                        const duration = pickJoin(movieInfo, ['duration', 'runtime', 'length', 'time']);
                        const country = pickJoin(movieInfo, ['country', 'countries', 'region', 'nation', 'origin']);
                        const directors = pickJoin(movieInfo, ['directors', 'director']);
                        const stars = pickJoin(movieInfo, ['stars', 'cast', 'actors', 'casts']);

                        const movieDetailsText =
`🎥 *[ MOVIE DETAILS ]*
🖼️ *Title:* ${movieInfo.title}
⭐ *IMDB:* ${rating}/10
🕒 *Runtime:* ${duration}
📅 *Year:* ${pickJoin(movieInfo, ['year', 'release_year', 'releaseYear'])}
🌍 *Country:* ${country}
✍️ *Story/Cast:*
Director: ${directors}
Stars: ${stars}

💡 *Sinhala AI Sub Available!*`;

                        const moviePosterUrl = movieInfo.image || selectedItem.image || DEFAULT_IMAGE;
                        await socket.sendMessage(sender, {
                            image: { url: moviePosterUrl },
                            caption: movieDetailsText
                        }, { quoted: replyMek });
                        const downloadOptionsText =
`📥 *DOWNLOAD OPTIONS*
${validDownloads.map((dl, i) => `${i + 1}. ${dl.quality === 'SUB' ? detectSubLabel(dl, i) : dl.quality} (${dl.size || 'N/A'})`).join('\n')}
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
                                const subLabel = isSub ? detectSubLabel(selectedDownload, choiceNum) : null;
                                const fileName = isSub ? `${movieInfo.title} - ${subLabel}.srt` : `${movieInfo.title} - ${selectedDownload.quality}.mp4`;

                                await socket.sendMessage(sender, { react: { text: '⏳', key: downloadMek.key } });
                                try {
                                    const finalDirectLink = selectedDownload.link || selectedDownload.url;
                                    await socket.sendMessage(sender, {
                                        document: { url: finalDirectLink },
                                        mimetype: mimeType,
                                        fileName: fileName,
                                        caption: isSub ? `${movieInfo.title} - Subtitle\n\n*Language:* ${subLabel}\n*Size:* ${selectedDownload.size || 'N/A'}\n\n${DEFAULT_FOOTER}` : `${movieInfo.title}\n\n*Quality:* ${selectedDownload.quality}\n*Size:* ${selectedDownload.size}\n\n${DEFAULT_FOOTER}`
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
