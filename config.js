const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://i.ibb.co/G9DC8S0/alive.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "I'm Alive Now",
    MOVIE_API_KEY: process.env.API_KEY || "sky|2483faa7f5630311464123d017fc7acc2aec6da0",

    // Gemini AI Keys - Supports multiple keys (recommended for quota limits)
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS 
        ? process.env.GEMINI_API_KEYS.split(',').map(key => key.trim()).filter(Boolean)
        : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [AQ.Ab8RN6LSttakd5WOd674fI-2RNtwWqMKfIl-ERrTT6fr9m3zhw,
                                                                        AQ.Ab8RN6IWRkQJ6C9bDXAlDW2gKx_UDArMzAeLJCWygcuzUZzm0g,
                                                                       AQ.Ab8RN6I2rdG2ncoq8e1TSNEZrsQtCuZR1DmvOWIQUqWlpDNYCQ]),
};
