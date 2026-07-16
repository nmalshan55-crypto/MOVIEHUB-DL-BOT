// Full Body Creater= Liyanaarachchi Avishka
// pixaldrain , mega download succusfully added 

const { cmd } = require("../command");
const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { File } = require('megajs'); // Added for MEGA integration

// Cache initialization with 1 minute TTL
const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Simplified theme for details card
const simpleTheme = {
  box: function(title, content) {
    return `ðŸŽ¬ Movie Hub ðŸŽ¬\n\n${title}\n\n${content}`;
  },
  getForwardProps: function() {
    return {
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        stanzaId: "BAE5" + Math.random().toString(16).substr(2, 12).toUpperCase(),
        mentionedJid: [],
        conversionData: {
          conversionDelaySeconds: 0,
          conversionSource: "movie_hub",
          conversionType: "message"
        }
      }
    };
  },
  resultEmojis: ["ðŸ“½ï¸", "ðŸŽ¥", "ðŸŽ¬", "ðŸ“½ï¸", "ðŸŽžï¸"]
};

// Temporary file path for downloading
const tempDir = path.join(__dirname, 'temp');
const ensureTempDir = async () => {
  try {
    await fsp.mkdir(tempDir, { recursive: true });
  } catch (err) {
    console.error(`[01:54 PM +0530] Failed to create temp directory: ${err.message}`);
  }
};

// MEGA download helper function
async function downloadFromMega(conn, megaUrl, from, qualityMessage, selectedFilm, selectedLink) {
  try {
    await ensureTempDir();
    console.log(`[01:54 PM +0530] Processing MEGA URL: ${megaUrl}`);
    const file = File.fromURL(megaUrl);

    // Load file attributes
    await file.loadAttributes();
    console.log(`[01:54 PM +0530] File attributes loaded: ${file.name}, Size: ${file.size} bytes`);

    // Check file size against WhatsApp limit (2GB = 2,147,483,648 bytes)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return conn.sendMessage(from, {
        text: simpleTheme.box("Size Error", 
          `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds WhatsApp's 2GB limit.`),
        ...simpleTheme.getForwardProps()
      }, { quoted: qualityMessage });
    }

    // Notify user of download start
    await conn.sendMessage(from, {
      text: simpleTheme.box("Download Started", 
        `Downloading ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`),
      ...simpleTheme.getForwardProps()
    }, { quoted: qualityMessage });

    // Download the file
    const tempFilePath = path.join(tempDir, file.name.replace(/[^\w\s.]/gi, '_'));
    let downloadAttempt = 0;
    const maxAttempts = 4;
    let downloadedSize = 0;
    let lastProgressUpdate = 0;

    while (downloadAttempt < maxAttempts) {
      const writer = fs.createWriteStream(tempFilePath);
      const stream = file.download({ timeout: 600000 }); // 10-minute timeout

      stream.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = (downloadedSize / file.size * 100).toFixed(1);
        if (Date.now() - lastProgressUpdate > 30000) { // Update every 30 seconds
          console.log(`[01:54 PM +0530] Download progress: ${progress}% (${downloadedSize} bytes)`);
          conn.sendMessage(from, {
            text: simpleTheme.box("Download Progress", 
              `${file.name}: ${progress}% completed`),
            ...simpleTheme.getForwardProps()
          }, { quoted: qualityMessage });
          lastProgressUpdate = Date.now();
        }
      });

      stream.on('error', (error) => {
        console.error(`[01:54 PM +0530] Stream error on attempt ${downloadAttempt + 1}: ${error.message}`);
        writer.end();
      });

      stream.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const fileStats = await fsp.stat(tempFilePath);
      if (Math.abs(fileStats.size - file.size) < 1024 * 10 || fileStats.size >= file.size) {
        break;
      } else {
        downloadAttempt++;
        await fsp.unlink(tempFilePath);
        console.log(`[01:54 PM +0530] Attempt ${downloadAttempt}/${maxAttempts} failed, size ${fileStats.size} bytes, retrying...`);
        if (downloadAttempt === maxAttempts) {
          throw new Error(`Downloaded file size (${fileStats.size} bytes) does not match expected (${file.size} bytes) after ${maxAttempts} attempts`);
        }
      }
    }

    const finalStats = await fsp.stat(tempFilePath);
    if (finalStats.size < file.size) {
      await fsp.unlink(tempFilePath);
      throw new Error(`Downloaded file size (${finalStats.size} bytes) does not match expected (${file.size} bytes)`);
    }

    // Send the file as a document
    await conn.sendMessage(from, {
      document: { url: tempFilePath },
      mimetype: file.mimeType || "application/octet-stream",
      fileName: file.name,
      caption: `ðŸŽ¬ ${selectedFilm.title} (${selectedFilm.year})\n\nQuality: ${selectedLink.quality}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nDownloaded from MEGA!`,
      ...simpleTheme.getForwardProps()
    }, { quoted: qualityMessage });

    await conn.sendMessage(from, { 
      react: { 
        text: simpleTheme.resultEmojis[Math.floor(Math.random() * simpleTheme.resultEmojis.length)], 
        key: qualityMessage.key 
      } 
    });

    // Clean up temporary file
    await fsp.unlink(tempFilePath);
    console.log(`[01:54 PM +0530] Successfully sent ${file.name} and cleaned up`);
  } catch (e) {
    console.error("[01:54 PM +0530] Error in MEGA download:", e);
    await conn.sendMessage(from, {
      text: simpleTheme.box("Error", 
        `Sorry, an error occurred:\n\n${e.message || "Unknown error"}\n\nPlease try again later`),
      ...simpleTheme.getForwardProps()
    }, { quoted: qualityMessage });
    await conn.sendMessage(from, { react: { text: "âŒ", key: qualityMessage.key } });
  }
}

// Film search and download command
cmd({
  pattern: "film3",
  react: "ðŸŽ¬",
  desc: "Get Movies from Movie Hub to Enjoy Cinema",
  category: "Movie Hub",
  filename: __filename,
}, async (conn, mek, m, { from, q, pushname, reply }) => {
  if (!q) {
    return reply(simpleTheme.box("Sinhala Sub Movie", 
      "Use: .film <film name>\nâœ¨ Ex: .film 2025\nMovie Hub List"));
  }

  try {
    await ensureTempDir();

    // Step 1: Check cache for movie info
    const cacheKey = `film_search_${q.toLowerCase()}`;
    let searchData = searchCache.get(cacheKey);

    if (!searchData) {
      const searchUrl = `https://searchsub.netlify.app/api/search/search?text=${encodeURIComponent(q)}`;
      let retries = 3;
      
      while (retries > 0) {
        try {
          console.log(`[01:54 PM +0530] Attempting search API call to ${searchUrl}`);
          const searchResponse = await axios.get(searchUrl, { timeout: 15000 });
          console.log("[01:54 PM +0530] Raw search response:", JSON.stringify(searchResponse.data, null, 2));
          
          searchData = searchResponse.data.filter(item => item.status === 200);
          
          if (!Array.isArray(searchData) || searchData.length === 0) {
            console.log("[01:54 PM +0530] Search API returned empty or invalid data after filtering:", searchData);
            throw new Error("No movies found or invalid response from search API");
          }
          
          searchCache.set(cacheKey, searchData);
          console.log(`[01:54 PM +0530] Successfully fetched ${searchData.length} movies`);
          break;
        } catch (error) {
          retries--;
          console.error(`[01:54 PM +0530] Search API call failed (attempt ${4 - retries}/3): ${error.message}`, error.response?.data || "No response data");
          if (retries === 0) throw new Error("Failed to fetch movie list after multiple attempts");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Step 2: Format movie list
    let filmList = `sá´œÊ™.ÊŸá´‹ á´á´á´ Éªá´‡ Ê€á´‡sá´œÊŸá´›s.\n\n`;
    filmList += `ðŸ”sá´‡á´€Ê€á´„Êœ: ${q}\n\n`;
    filmList += `â­•.Ê€á´‡á´˜ÊŸÊ á´¡Éªá´›Êœ É´á´œá´Ê™á´‡Ê€ á´Ò“ á´›Êœá´‡ á´á´á´ Éªá´‡ Êá´á´œ á´¡á´€É´á´›:\n\n`;

    const films = searchData.slice(0, 10).map((film, index) => ({
      number: index + 1,
      title: film.title || `Untitled Movie ${index + 1}`,
      year: film.year || "N/A",
      link: film.url || `https://sub.lk/movies/${film.title.toLowerCase().replace(/ /g, '-')}-${film.year || '2025'}-sinhala-sub`,
      image: film.image || "https://i.ibb.co/5Yb4VZy/snowflake.jpg",
      imdb: film.ratings?.imdb || 'N/A'
    }));

    films.forEach(film => {
      console.log(`[01:54 PM +0530] Movie ${film.number}: ${film.title} (Link: ${film.link})`);
      filmList += `${film.number}. ${film.title} (${film.year})\n`;
    });

    filmList += `\n*á´˜á´á´¡á´‡á´€Ê€á´… Ê™Ê á´›á´„á´„ á´›á´‡á´€á´*`;

    // Step 3: Send movie list
    const sentMessage = await conn.sendMessage(from, {
      text: filmList,
      ...simpleTheme.getForwardProps()
    }, { quoted: mek });

    // Step 4: Wait for movie selection
    const filmSelectionHandler = async (update) => {
      const message = update.messages[0];
      if (!message?.message?.extendedTextMessage) return;

      const userReply = message.message.extendedTextMessage.text.trim();
      if (message.message.extendedTextMessage.contextInfo?.stanzaId !== sentMessage.key.id) return;

      const selectedNumber = parseInt(userReply);
      const selectedFilm = films.find(film => film.number === selectedNumber);

      if (!selectedFilm) {
        await conn.sendMessage(from, {
          text: simpleTheme.box("Invalid Selection", 
            "Please select a valid number from the list"),
          ...simpleTheme.getForwardProps()
        }, { quoted: message });
        return;
      }

      console.log(`[01:54 PM +0530] Selected movie: ${selectedFilm.title} (Link: ${selectedFilm.link})`);
      // Remove film selection listener
      conn.ev.off("messages.upsert", filmSelectionHandler);

      let details = null;
      let thumbnailUrl = selectedFilm.image;

      try {
        // Step 5: Get movie details
        const detailsUrl = `https://detailssub.netlify.app/api/details/functions?url=${encodeURIComponent(selectedFilm.link)}`;
        console.log(`[01:54 PM +0530] Attempting details API call to ${detailsUrl}`);
        const detailsResponse = await axios.get(detailsUrl, { timeout: 15000 });
        console.log("[01:54 PM +0530] Raw details response:", JSON.stringify(detailsResponse.data, null, 2));
        details = detailsResponse.data;

        if (!details || !details.title) {
          throw new Error("Failed to fetch movie details or invalid response");
        }

        // Step 6: Select highest quality thumbnail from imageLinks
        if (details.imageLinks && details.imageLinks.length > 0) {
          thumbnailUrl = details.imageLinks[details.imageLinks.length - 1];
          console.log(`[01:54 PM +0530] Selected thumbnail: ${thumbnailUrl}`);
        }
      } catch (detailsError) {
        console.error(`[01:54 PM +0530] Details error: ${detailsError.message}`);
        details = {
          title: selectedFilm.title,
          imdb: selectedFilm.imdb || 'N/A',
          description: 'No description available',
          movieUrl: selectedFilm.link
        };
      }

      // Step 7: Display details card with high-quality thumbnail
      let detailsCard = `âš•ï¸*á´á´á´ Éªá´‡ á´…á´‡á´›á´€ÉªÊŸs* â™‚\n\n`;
      detailsCard += `*á´›Éªá´›ÊŸá´‡*: ${details.title}\n`;
      detailsCard += `*Éªá´á´…Ê™*: ${details.imdb}\n`;
      detailsCard += `*á´…á´‡sá´„Ê€Éªá´˜á´›Éªá´É´*: ${details.description}\n`;
      detailsCard += `\nðŸ”— *á´á´á´ Éªá´‡ á´œÊ€ÊŸ*: ${details.movieUrl}\n`;

      await conn.sendMessage(from, {
        image: { url: thumbnailUrl },
        caption: simpleTheme.box("Movie Details", detailsCard),
        ...simpleTheme.getForwardProps()
      }, { quoted: message });

      // Step 8: Get download links automatically
      const downloadUrl = `https://downsub.netlify.app//api/download/functions?url=${encodeURIComponent(details.movieUrl || selectedFilm.link)}`;
      console.log(`[01:54 PM +0530] Attempting download API call to ${downloadUrl}`);
      let downloadData;
      let downloadRetries = 3;

      while (downloadRetries > 0) {
        try {
          const downloadResponse = await axios.get(downloadUrl, { timeout: 15000 });
          console.log("[01:54 PM +0530] Raw download response:", JSON.stringify(downloadResponse.data, null, 2));
          downloadData = downloadResponse.data;

          if (downloadData.status !== 200 || !Array.isArray(downloadData.downloadLinks) || downloadData.downloadLinks.length === 0) {
            throw new Error("No download links available or invalid response");
          }
          break;
        } catch (error) {
          downloadRetries--;
          console.error(`[01:54 PM +0530] Download API call failed (attempt ${4 - downloadRetries}/3): ${error.message}`, error.response?.data || "No response data");
          if (downloadRetries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Step 9: Display download menu list with redirectUrl
      const downloadLinks = downloadData.downloadLinks.map((link, i) => ({
        number: i + 1,
        quality: link.quality,
        size: link.size,
        url: link.redirectLink
      }));

      let downloadOptions = `ðŸ“¥ *á´…á´á´¡É´ÊŸá´á´€á´… á´á´˜á´›Éªá´É´ Ò“á´Ê€ ${selectedFilm.title} (${selectedFilm.year})* ðŸ“¥\n\n`;
      downloadOptions += `ðŸŽ¬ *á´€á´ á´€ÉªÊŸÊ™ÊŸá´‡ Ç«á´œá´€ÊŸÉªá´›Ê Ê™á´œá´›á´›á´É´s*:\n\n`;

      downloadLinks.forEach(link => {
        downloadOptions += `${link.number}. ${link.quality} (${link.size}) - Redirect: ${link.url}\n`;
      });

      downloadOptions += `\nÊ€á´‡á´˜ÊŸÊ Ç«á´œÊŸÊŸÉªá´›Ê Ê™á´œá´›á´›á´É´s. á´€Ò“á´›á´‡Ê€ á´á´á´ Éªá´‡ á´…á´á´¡É´ÊŸá´á´€á´…á´‡á´….`;
      downloadOptions += `\n*á´˜á´á´¡á´‡á´€Ê€á´… Ê™Ê á´›á´„á´„ á´›á´‡á´€á´.*`;

      const downloadButtonMessage = await conn.sendMessage(from, {
        image: { url: thumbnailUrl },
        caption: simpleTheme.box("Download Qualities", downloadOptions),
        ...simpleTheme.getForwardProps()
      }, { quoted: message });

      // Step 10: Wait for quality selection
      const qualitySelectionHandler = async (updateQuality) => {
        const qualityMessage = updateQuality.messages[0];
        if (!qualityMessage?.message?.extendedTextMessage) return;

        const qualityReply = qualityMessage.message.extendedTextMessage.text.trim();
        if (qualityMessage.message.extendedTextMessage.contextInfo?.stanzaId !== downloadButtonMessage.key.id) return;

        console.log(`[01:54 PM +0530] Quality reply received: ${qualityReply}`);

        const selectedQualityNumber = parseInt(qualityReply);
        const selectedLink = downloadLinks.find(link => link.number === selectedQualityNumber);

        if (!selectedLink) {
          console.log(`[01:54 PM +0530] Invalid quality number selected: ${qualityReply}`);
          await conn.sendMessage(from, {
            text: simpleTheme.box("Invalid Quality", 
              "Please select a valid quality button number"),
            ...simpleTheme.getForwardProps()
          }, { quoted: qualityMessage });
          return;
        }

        console.log(`[01:54 PM +0530] Selected quality: ${selectedLink.quality} (URL: ${selectedLink.url})`);
        // Remove quality selection listener
        conn.ev.off("messages.upsert", qualitySelectionHandler);

        // Step 11: Process redirectUrl through Dark-Yasiya API for PixelDrain or MEGA
        let finalDownloadUrl = selectedLink.url;

        if (selectedLink.url.includes("pixeldrain.com/u/")) {
          const downloadUrlDark = `https://www.dark-yasiya-api.site/download/pixeldrain?url=${encodeURIComponent(selectedLink.url)}`;
          console.log(`[01:54 PM +0530] Attempting Dark-Yasiya API call to ${downloadUrlDark}`);
          let darkResponse;
          let darkRetries = 3;

          while (darkRetries > 0) {
            try {
              darkResponse = await axios.get(downloadUrlDark, { timeout: 15000 });
              console.log("[01:54 PM +0530] Raw Dark-Yasiya response:", JSON.stringify(darkResponse.data, null, 2));
              if (darkResponse.data.status && darkResponse.data.result?.dl_link) {
                finalDownloadUrl = darkResponse.data.result.dl_link;
                selectedLink.quality = darkResponse.data.result.fileName.replace(/\.\w+$/, '').split('(')[0].trim();
                selectedLink.size = (darkResponse.data.result.fileSize / (1024 * 1024)).toFixed(2) + " MB";
                console.log(`[01:54 PM +0530] Updated download URL to dl_link: ${finalDownloadUrl}`);
              } else {
                throw new Error("Invalid response from Dark-Yasiya API");
              }
              break;
            } catch (darkError) {
              darkRetries--;
              console.error(`[01:54 PM +0530] Dark-Yasiya API call failed (attempt ${4 - darkRetries}/3): ${darkError.message}`, darkError.response?.data || "No response data");
              if (darkRetries === 0) throw darkError;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } else if (selectedLink.url.match(/^https:\/\/mega\.(nz|co\.nz)\/(?:file|folder)\/[#!\w-]+$/)) {
          await downloadFromMega(conn, selectedLink.url, from, qualityMessage, selectedFilm, selectedLink);
          return; // Exit early if MEGA download is handled
        }

        // Step 12: Download and send the movie file as document for non-MEGA/non-PixelDrain links
        try {
          console.log(`[01:54 PM +0530] Starting download from: ${finalDownloadUrl}`);
          const tempFilePath = path.join(tempDir, `${selectedFilm.title.replace(/[^\w\s]/gi, '')}_${selectedLink.quality.replace(/\s+/g, '_')}.mp4`);
          
          let downloadAttempt = 0;
          const maxAttempts = 3;
          let response;

          while (downloadAttempt < maxAttempts) {
            try {
              response = await axios({
                method: 'get',
                url: finalDownloadUrl,
                responseType: 'stream',
                maxRedirects: 10,
                timeout: 60000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': '*/*'
                }
              });
              break;
            } catch (error) {
              downloadAttempt++;
              console.error(`[01:54 PM +0530] Download attempt ${downloadAttempt}/${maxAttempts} failed for ${finalDownloadUrl}: ${error.message}`, error.response?.status, error.response?.headers);
              if (downloadAttempt === maxAttempts) throw error;
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }

          const writer = fs.createWriteStream(tempFilePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          const fileStats = await fsp.stat(tempFilePath);
          const fileSize = fileStats.size;
          const minSize = 1024 * 1024; // 1MB minimum size
          console.log(`[01:54 PM +0530] Downloaded file size: ${fileSize} bytes`);

          if (fileSize < minSize) {
            await fsp.unlink(tempFilePath);
            throw new Error(`Downloaded file size (${fileSize} bytes) too small, likely not the original movie`);
          }

          await conn.sendMessage(from, {
            document: { url: tempFilePath },
            mimetype: "video/mp4",
            fileName: `${selectedFilm.title.replace(/[^\w\s]/gi, '')}_${selectedLink.quality.replace(/\s+/g, '_')}.mp4`,
            caption: `ðŸŽ¬ ${selectedFilm.title} (${selectedFilm.year})\n\nÇ«á´œá´€ÊŸÉªá´›Ê: ${selectedLink.quality}\nsÉªá´¢á´‡: ${selectedLink.size}\n\ná´˜á´á´¡á´‡á´€Ê€á´… Ê™Ê á´›á´„á´„ á´›á´‡á´€á´.`,
            ...simpleTheme.getForwardProps()
          }, { quoted: qualityMessage });

          await conn.sendMessage(from, { 
            react: { 
              text: simpleTheme.resultEmojis[Math.floor(Math.random() * simpleTheme.resultEmojis.length)], 
              key: qualityMessage.key 
            } 
          });

          await fsp.unlink(tempFilePath);
          console.log(`[01:54 PM +0530] Successfully sent movie and cleaned up temp file`);
        } catch (downloadError) {
          console.error(`[01:54 PM +0530] Failed to send movie: ${downloadError.message}`, downloadError.stack);
          await conn.sendMessage(from, {
            text: simpleTheme.box("Download Failed", 
              `Failed to send the movie. The file may be invalid or the link requires manual download:\n\n${finalDownloadUrl}\n\nError: ${downloadError.message}`),
            ...simpleTheme.getForwardProps()
          }, { quoted: qualityMessage });
        }
      };

      // Register quality selection listener
      conn.ev.on("messages.upsert", qualitySelectionHandler);
    };

    // Register film selection listener
    conn.ev.on("messages.upsert", filmSelectionHandler);
  } catch (e) {
    console.error("[01:54 PM +0530] Error in film command:", e);
    const errorMsg = simpleTheme.box("Error", 
      `Sorry, an error occurred:\n\n${e.message || "Unknown error"}\n\nPlease try again later`);
    
    await reply(errorMsg);
    await conn.sendMessage(from, { react: { text: "âŒ", key: mek.key } });
  }
});
