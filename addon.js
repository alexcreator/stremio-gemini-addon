// addon.js

const { addonBuilder } = require('stremio-addon-sdk');
const fetch = require('node-fetch'); // Ako koristiš fetch za Gemini

// --- Gemini API key ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'ovdje-stavi-svoj-api-key';

// Kreiranje addon buildera (bez "new")
const builder = addonBuilder({
    id: 'stremio-gemini-addon-hqowwa',
    version: '1.0.0',
    name: 'Stremio Gemini Addon',
    description: 'Addon koji prevodi engleske titlove koristeći Gemini AI',
    resources: ['subtitles'],
    types: ['movie', 'series'],
    catalogs: []
});

// Funkcija za prevođenje titlova preko Gemini API
async function translateSubtitle(text) {
    if (!GEMINI_API_KEY) return text;

    try {
        const res = await fetch('https://api.gemini.ai/translate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, target_language: 'sr' })
        });
        const data = await res.json();
        return data.translated_text || text;
    } catch (err) {
        console.error('Greška pri prevođenju:', err);
        return text;
    }
}

// Handler za subove
builder.defineSubtitlesHandler(async ({ id, type, url }) => {
    // Pretpostavimo da Stremio već šalje URL titla
    const res = await fetch(url);
    const text = await res.text();

    const translated = await translateSubtitle(text);

    return [
        {
            id: 'srp',
            url: `data:text/plain;charset=utf-8,${encodeURIComponent(translated)}`,
            lang: 'sr',
            name: 'Serbian (translated)'
        }
    ];
});

// --- Start server ---
const PORT = process.env.PORT || 8080;
builder.listen(PORT, '0.0.0.0');
console.log(`Addon listening on port ${PORT}`);
