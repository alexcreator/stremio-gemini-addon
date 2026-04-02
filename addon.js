const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");
const fs = require("fs");

// 🔑 API KEY
const genAI = new GoogleGenerativeAI(process.env.AIzaSyD6heS3A5AdaM8_SYy1pru3IQ-RrE0k3Ys);

// 📁 cache fajl
const CACHE_FILE = "./cache.json";

// 📥 učitaj cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch {
        cache = {};
    }
}

// 💾 snimi cache
function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

// 🔑 hash
function generateHash(text) {
    return crypto.createHash("md5").update(text).digest("hex");
}

// ✂️ split
function splitText(text, maxLength = 2000) {
    const parts = [];
    let current = "";

    for (let line of text.split("\n")) {
        if ((current + line).length > maxLength) {
            parts.push(current);
            current = "";
        }
        current += line + "\n";
    }
    if (current) parts.push(current);

    return parts;
}

// 🌍 prevod
async function translateText(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Prevedi na srpski (latinica). Zadrži SRT format:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

// 🎬 addon
const builder = new addonBuilder({
    id: "org.gemini.translate.persistent",
    version: "1.2.0",
    name: "Translate EN → SR (Persistent Cache)",
    resources: ["subtitles"],
    types: ["movie", "series"]
});

builder.defineSubtitlesHandler(async (args) => {
    const subtitles = [];

    for (let sub of (args.subtitles || [])) {
        if (sub.lang === "eng") {
            try {
                const res = await axios.get(sub.url);
                const original = res.data;

                const hash = generateHash(original);

                // ⚡ CACHE HIT
                if (cache[hash]) {
                    console.log("CACHE HIT 💾");
                    subtitles.push({
                        id: sub.id + "_sr_cached",
                        lang: "srp",
                        url: "data:text/plain;charset=utf-8," + encodeURIComponent(cache[hash])
                    });
                    continue;
                }

                console.log("TRANSLATING ⏳");

                const chunks = splitText(original);
                let translated = "";

                for (let part of chunks) {
                    translated += await translateText(part);
                }

                // 💾 SPREMI
                cache[hash] = translated;
                saveCache();

                subtitles.push({
                    id: sub.id + "_sr",
                    lang: "srp",
                    url: "data:text/plain;charset=utf-8," + encodeURIComponent(translated)
                });

            } catch (e) {
                console.log("Greška:", e.message);
            }
        }
    }

    return { subtitles };
});

// 🚀 server
require("http")
    .createServer(builder.getInterface())
    .listen(process.env.PORT || 7000, () => {
        console.log("Addon running...");
    });