const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const geminiKey = process.env.GEMINI_API_KEY || "";

// BUILD MANIFEST
const builder = new addonBuilder({
    id: "org.gemini.translate.persistent",
    version: "1.0.0",
    name: "Translate EN → SR (Persistent Cache)",
    resources: ["subtitles"],
    types: ["movie", "series"],
    catalogs: []
});

// SUBTITLES HANDLER
builder.defineSubtitlesHandler(async function(args, cb) {
    const textEN = "This is an example subtitle text.";
    
    let textSR = textEN;
    if (geminiKey) {
        try {
            const res = await fetch("https://api.generativeai.google/v1/translate", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${geminiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: textEN, targetLanguage: "sr" })
            });
            const data = await res.json();
            textSR = data.translatedText || textEN;
        } catch(e) {
            console.error("Gemini API error:", e);
        }
    }

    return [{
        name: "SR",
        url: "data:text/plain," + encodeURIComponent(textSR),
        lang: "sr"
    }];
});

// START SERVER
require("http")
    .createServer(builder.getInterface())
    .listen(process.env.PORT || 8800, () => {
        console.log("Addon running...");
    });
