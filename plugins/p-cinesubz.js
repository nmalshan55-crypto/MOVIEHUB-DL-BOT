'use strict';

const { cmd } = require('../command');
const axios = require('axios');

// ─── CONFIG ───
const API_BASE = (process.env.API_BASE || 'https://inherent-elayne-shandroid770-59fb0872.koyeb.app').replace(/\/+$/, '');
const API_KEY = process.env.SAHAN_API_KEY || 'sahan_api_a0078dcb6c082312bcbce75004ab119c';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500';
const DEFAULT_FOOTER = '\n\n> *Powered by CineSubz-DL* 🎬';
const LISTENER_TIMEOUT = 5 * 60 * 1000;
const MAX_FILE_SIZE = 2048 * 1024 * 1024;

// ─── API CLIENT ───
const api = axios.create({
    baseURL: API_BASE,
    params: { api_key: API_KEY },
    timeout: 60000,
});

// ─── HELPERS ───
function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}

function getType(url) {
    if (!url) return '🎬 Movie';
    if (/tvshows|series|tv/i.test(url)) return '📺 Series';
    return '🎬 Movie';
}

function cleanTitle(title) {
    return title
        .replace(/Sinhala Subtitles.*$/i, '')
        .replace(/\|.*$/, '')
        .replace(/\(\s*\)/g, '')
        .trim();
}

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

async function sendImage(socket, sender, imageUrl, caption, quotedMsg) {
    try {
        await socket.sendMessage(sender, {
            image: { url: imageUrl },
            caption,
        }, { quoted: quotedMsg });
    } catch {
        await socket.sendMessage(sender, { text: caption }, { quoted: quotedMsg });
    }
}

function createListener(socket, handler, timeoutMs = LISTENER_TIMEOUT) {
    let active = true;

    const wrapper = async (event) => {
        if (!active) return;
        await handler(event);
    };

    const cleanup = () => {
        if (!active) return;
        active = false;
        socket.ev.off('messages.upsert', wrapper);
    };

    socket.ev.on('messages.upsert', wrapper);
    const timer = setTimeout(cleanup, timeoutMs);

    return { cleanup, resetTimer: () => { clearTimeout(timer); setTimeout(cleanup, timeoutMs); } };
}

// ══════════════════════════════════════════════
//  COMMAND
// ══════════════════════════════════════════════

cmd(
    {
        pattern: 'cz',
        alias: ['cine', 'cinemovie', 'cinesubz'],
        desc: 'Search and download movies/series from CineSubz',
        category: 'download',
        react: '🎬',
        filename: __filename,
    },
    async (socket, msg, m, { from, args, prefix, command }) => {
        const sender = from;

        if (!args.length) {
            return socket.sendMessage(sender, {
                text: `╔══ *Moviehub-DL Movie Bot* ══╗\n\n` +
                    `❌ *No search query provided!*\n\n` +
                    `📌 *Usage:*\n` +
                    `${prefix}${command} <movie name>\n\n` +
                    `📌 *Examples:*\n` +
                    `${prefix}${command} Spider Man\n` +
                    `${prefix}${command} Avengers 2024\n` +
                    `${prefix}${command} Squid Game${DEFAULT_FOOTER}`,
            }, { quoted: msg });
        }

        const query = args.join(' ');

        await socket.sendMessage(sender, {
            text: `🔍 *Searching CineSubz...*\n\nQuery: *${query}*\nPlease wait a moment...`,
        }, { quoted: msg });

        await socket.sendPresenceUpdate('composing', sender);

        // ── STEP 1: SEARCH ──
        let searchResults;

        try {
            const { data } = await api.get('/api/search', {
                params: { text: query },
            });

            if (!data.success || !data.results || data.results.length === 0) {
                return socket.sendMessage(sender, {
                    text: `╔══ *CineSubz* ══╗\n\n` +
                        `❌ *No results found!*\n\n` +
                        `Query: *${query}*\n\n` +
                        `💡 Try different keywords or check spelling.${DEFAULT_FOOTER}`,
                }, { quoted: msg });
            }

            searchResults = data.results.slice(0, 20);
        } catch (err) {
            console.error('[CZ SEARCH]', err.message);
            return socket.sendMessage(sender, {
                text: `❌ *Search failed!*\n\nError: ${err.message}\n\nPlease try again later.${DEFAULT_FOOTER}`,
            }, { quoted: msg });
        }

        let listText = `╔══ *CineSubz Search Results* ══╗\n\n`;
        listText += `🔍 Query: *${query}*\n`;
        listText += `📊 Found: *${searchResults.length}* results\n`;
        listText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        searchResults.forEach((item, i) => {
            const type = getType(item.url);
            const title = cleanTitle(item.title);
            listText += `*${pad(i + 1)}.* ${type} *${title}*\n`;
        });

        listText += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        listText += `📩 *Reply with a number to select*${DEFAULT_FOOTER}`;

        const sentMsg = await socket.sendMessage(sender, {
            text: listText,
        }, { quoted: msg });

        const sentMsgId = sentMsg.key.id;

        // ── STEP 2: SELECTION LISTENER ──
        const { cleanup: cleanupSelection } = createListener(socket, async ({ messages }) => {
            const replyMsg = messages[0];
            if (!replyMsg?.message) return;

            const isFromSameChat = replyMsg.key.remoteJid === sender;
            const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
            const isReplyToList = replyContext?.stanzaId === sentMsgId;

            if (!isFromSameChat || !isReplyToList) return;

            const replyText = (
                replyMsg.message.conversation ||
                replyMsg.message.extendedTextMessage?.text || ''
            ).trim();

            const choiceIndex = parseInt(replyText) - 1;

            if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= searchResults.length) {
                await socket.sendMessage(sender, {
                    text: `⚠️ *Invalid number!*\nPlease reply with a number between *01* and *${pad(searchResults.length)}*`,
                }, { quoted: replyMsg });
                return;
            }

            cleanupSelection();

            const selected = searchResults[choiceIndex];
            const selectedTitle = cleanTitle(selected.title);

            await socket.sendMessage(sender, {
                text: `📡 *Fetching details...*\n\n🎬 *${selectedTitle}*\nPlease wait...`,
            }, { quoted: replyMsg });

            await socket.sendPresenceUpdate('composing', sender);

            // ── STEP 3: FETCH DETAILS ──
            let movieData;

            try {
                const { data } = await api.get('/api/fetch', {
                    params: { url: selected.url },
                });

                if (!data.success || !data.data) {
                    return socket.sendMessage(sender, {
                        text: `❌ *Failed to fetch details!*\n\n` +
                            `Movie: *${selectedTitle}*\n\n` +
                            `Please try again or use a different result.${DEFAULT_FOOTER}`,
                    }, { quoted: replyMsg });
                }

                movieData = data.data;
            } catch (err) {
                console.error('[CZ FETCH]', err.message);
                return socket.sendMessage(sender, {
                    text: `❌ *Failed to fetch details!*\n\nError: ${err.message}${DEFAULT_FOOTER}`,
                }, { quoted: replyMsg });
            }

            const dlUrls = movieData.downloadUrls || {};
            const dlKeys = Object.keys(dlUrls);

            const shortDesc = movieData.description
                ? movieData.description.substring(0, 200) + (movieData.description.length > 200 ? '...' : '')
                : 'N/A';

            const posterUrl = movieData.poster || selected.poster || DEFAULT_IMAGE;

            let detailsCaption = `╔══ *Movie Details* ══╗\n\n`;
            detailsCaption += `🎬 *Title:* ${movieData.title || selectedTitle}\n`;
            if (movieData.meta?.year && movieData.meta.year !== 'N/A') detailsCaption += `📅 *Year:* ${movieData.meta.year}\n`;
            if (movieData.meta?.director && movieData.meta.director !== 'N/A') detailsCaption += `🎭 *Director:* ${movieData.meta.director}\n`;
            if (movieData.meta?.country && movieData.meta.country !== 'N/A') detailsCaption += `🌍 *Country:* ${movieData.meta.country}\n`;
            if (movieData.meta?.language && movieData.meta.language !== 'N/A') detailsCaption += `🗣 *Language:* ${movieData.meta.language}\n`;
            if (movieData.meta?.quality && movieData.meta.quality !== 'N/A') detailsCaption += `📊 *Quality:* ${movieData.meta.quality}\n`;
            if (movieData.meta?.subtitleBy && movieData.meta.subtitleBy !== 'N/A') detailsCaption += `✍️ *Subs By:* ${movieData.meta.subtitleBy}\n`;
            detailsCaption += `\n📝 *Story:*\n${shortDesc}${DEFAULT_FOOTER}`;

            await sendImage(socket, sender, posterUrl, detailsCaption, replyMsg);

            if (!dlKeys.length) {
                return socket.sendMessage(sender, {
                    text: `⚠️ *No download links available*\n\nThis movie may not have downloads yet.\n\n🔗 View on site: ${selected.url}${DEFAULT_FOOTER}`,
                }, { quoted: replyMsg });
            }

            let dlOptionsText = `╔══ *Download Options* ══╗\n\n`;
            dlOptionsText += `🎬 *${movieData.title || selectedTitle}*\n`;
            dlOptionsText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            dlOptionsText += `📥 *Select Quality:*\n\n`;

            dlKeys.forEach((quality, i) => {
                dlOptionsText += `*${pad(i + 1)}.* 🎥 ${quality}\n`;
            });

            dlOptionsText += `\n━━━━━━━━━━━━━━━━━━━━\n`;
            dlOptionsText += `📩 *Reply with a number to download*${DEFAULT_FOOTER}`;

            const dlOptionsMsg = await socket.sendMessage(sender, {
                text: dlOptionsText,
            }, { quoted: replyMsg });

            const dlOptionsMsgId = dlOptionsMsg.key.id;

            // ── STEP 4: DOWNLOAD LISTENER ──
            const { cleanup: cleanupDownload } = createListener(socket, async ({ messages }) => {
                const dlMsg = messages[0];
                if (!dlMsg?.message) return;

                const isFromSameChat2 = dlMsg.key.remoteJid === sender;
                const dlContext = dlMsg.message.extendedTextMessage?.contextInfo;
                const isReplyToDlOptions = dlContext?.stanzaId === dlOptionsMsgId;

                if (!isFromSameChat2 || !isReplyToDlOptions) return;

                const dlText = (
                    dlMsg.message.conversation ||
                    dlMsg.message.extendedTextMessage?.text || ''
                ).trim();

                const dlChoice = parseInt(dlText) - 1;

                if (isNaN(dlChoice) || dlChoice < 0 || dlChoice >= dlKeys.length) {
                    await socket.sendMessage(sender, {
                        text: `⚠️ *Invalid number!*\nPlease reply with a number between *01* and *${pad(dlKeys.length)}*`,
                    }, { quoted: dlMsg });
                    return;
                }

                cleanupDownload();

                const selectedQuality = dlKeys[dlChoice];
                const downloadLink = dlUrls[selectedQuality];
                const fileName = `${movieData.title || selectedTitle} [${selectedQuality}].mp4`
                    .replace(/[^\w\s\[\]().-]/g, '')
                    .trim();

                await socket.sendMessage(sender, {
                    react: { text: '📥', key: dlMsg.key },
                });

                await socket.sendMessage(sender, {
                    text: `📥 *Downloading...*\n\n` +
                        `🎬 *${movieData.title || selectedTitle}*\n` +
                        `📊 *Quality:* ${selectedQuality}\n\n` +
                        `⏳ This may take a while. Please wait...`,
                }, { quoted: dlMsg });

                await socket.sendPresenceUpdate('composing', sender);

                try {
                    // HEAD request to check size
                    let contentLength = 0;
                    try {
                        const headRes = await axios.head(downloadLink, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Referer': 'https://cinesubz.lk/',
                            },
                            timeout: 30000,
                            maxRedirects: 10,
                        });
                        contentLength = parseInt(headRes.headers['content-length'] || '0');
                    } catch {
                        // Continue without size check
                    }

                    if (contentLength > MAX_FILE_SIZE) {
                        return socket.sendMessage(sender, {
                            text: `⚠️ *File too large!*\n\n` +
                                `📁 *File:* ${fileName}\n` +
                                `📦 *Size:* ${formatSize(contentLength)}\n` +
                                `📊 *Limit:* ${formatSize(MAX_FILE_SIZE)}\n\n` +
                                `📥 *Download directly:*\n${downloadLink}${DEFAULT_FOOTER}`,
                        }, { quoted: dlMsg });
                    }

                    const fileStream = await axios({
                        method: 'GET',
                        url: downloadLink,
                        responseType: 'stream',
                        timeout: 30 * 60 * 1000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://cinesubz.lk/',
                        },
                        maxRedirects: 10,
                    });

                    const contentType = fileStream.headers['content-type'] || 'video/mp4';
                    const finalSize = parseInt(fileStream.headers['content-length'] || contentLength || '0');

                    await socket.sendMessage(sender, {
                        document: fileStream.data,
                        mimetype: contentType.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
                        fileName,
                        caption: `╔══ *Download Complete!* ══╗\n\n` +
                            `🎬 *${movieData.title || selectedTitle}*\n` +
                            `📊 *Quality:* ${selectedQuality}\n` +
                            `📦 *Size:* ${formatSize(finalSize)}\n` +
                            `🌐 *Language:* ${movieData.meta?.language || 'N/A'}\n` +
                            `✍️ *Subs By:* ${movieData.meta?.subtitleBy || 'N/A'}${DEFAULT_FOOTER}`,
                    }, { quoted: dlMsg });

                    await socket.sendMessage(sender, {
                        react: { text: '✅', key: dlMsg.key },
                    });

                } catch (dlErr) {
                    console.error('[CZ DOWNLOAD]', dlErr.message);

                    await socket.sendMessage(sender, {
                        react: { text: '❌', key: dlMsg.key },
                    });

                    await socket.sendMessage(sender, {
                        text: `❌ *Download Failed!*\n\n` +
                            `Error: ${dlErr.message}\n\n` +
                            `📥 *Try manually:*\n${downloadLink}${DEFAULT_FOOTER}`,
                    }, { quoted: dlMsg });
                }
            });
        });
    }
);
