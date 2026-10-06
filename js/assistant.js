/* Wanderly — Farell's portfolio assistant.
   A fully offline, hand-written knowledge base (121 intents) + matching
   engine + chat UI. No API keys, no network calls: everything runs here.

   Matching pipeline: normalize → tokenize (plural-folded + synonyms) →
   fuzzy spell-fix (Levenshtein) → phrase/topic scoring → tiered fallback
   (topic-shaped answers for unknown tech questions). */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Knowledge base. asks = phrase patterns, keys = topic tokens,        */
  /* a = answer, links = [{t,h}], page = {href,label}, top = scroll top. */
  /* ------------------------------------------------------------------ */
  var KB = [
    /* -------- greetings & identity -------- */
    {
      asks: ["hello", "hi", "hey", "yo", "good morning", "good evening"],
      keys: ["greetings", "sup"],
      a: "Hey! 👋 I'm Wanderly, Farell's assistant. Ask me about him, his projects (OpenVoice, Ripple), his studies at Purdue, or how to get around this site."
    },
    {
      asks: ["who is farell", "who's farell", "who is he", "about farell", "about him", "tell me about farell", "introduce him", "who is praditya", "full name"],
      keys: ["who", "farell", "praditya", "faadilah", "intro", "introduction", "bio", "identity", "name"],
      a: "Praditya Farell Raffa Faadilah — he goes by Farell. He studies Artificial Intelligence at Purdue University and builds local-first AI tools and data-driven products end-to-end: the model, the backend, and the interface.",
      page: { href: "about.html", label: "Read his About page" }
    },
    {
      asks: ["nickname", "what do his friends call him", "short name"],
      keys: ["nickname"],
      a: "Farell — it's on everything: his GitHub (pfarell), this site, and his projects. Praditya Farell Raffa Faadilah is the full name."
    },
    {
      asks: ["what does he do", "what does farell do", "his background", "what is he into", "what is he working on", "what can he do", "what are his skills", "what is he good at", "his abilities", "what are his abilities"],
      keys: ["does", "background", "focus", "working", "interesting", "builds", "capable", "abilities", "ability"],
      a: "His two public projects sum it up best:\n🎙️ OpenVoice — a fully local push-to-talk dictation app for Windows\n🌊 Ripple — a satellite water-quality forecast map with a grounded assistant\nUnder the hood that's Python, React/TypeScript, PySide6, speech models and Sentinel-2 satellite data.",
      links: [{ t: "GitHub", h: "https://github.com/pfarell" }],
      page: { href: "projects.html", label: "See his Projects" }
    },
    {
      asks: ["what is he studying", "his major", "where does he study", "education", "what is his degree", "purdue university", "does he go to purdue", "what is his latest education", "his latest edution"],
      keys: ["purdue", "university", "college", "school", "student", "major", "degree", "education", "studying", "studies", "edution"],
      a: "His major is Artificial Intelligence at Purdue University — it's even the headline of this site: \"AI @ Purdue\". 📚",
      page: { href: "about.html", label: "See About → Education" }
    },
    {
      asks: ["high school", "before purdue", "where did he study before"],
      keys: ["highschool", "before"],
      a: "Only Purdue is public — no high school or earlier details are listed anywhere I can see."
    },
    {
      asks: ["where does he live", "where is he from", "his location", "where is he based", "where does he stay"],
      keys: ["live", "lives", "living", "location", "based", "from", "indianapolis", "indiana", "city"],
      a: "His GitHub profile lists Indianapolis, IN. That's the only location he's made public, so I won't guess beyond it.",
      links: [{ t: "GitHub profile", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["what time is it for him", "his timezone", "what time zone", "what time is it there"],
      keys: ["timezone", "clock", "zone"],
      a: "His GitHub lists Indianapolis, Indiana — that's US Eastern Time."
    },
    {
      asks: ["what is his username", "his handle", "pfarell"],
      keys: ["username", "handle", "pfarell"],
      a: "pfarell — his GitHub handle, and the name this site is built for: pfarell.dev."
    },
    {
      asks: ["what is pfarell.dev", "his website", "does he have a website", "his site"],
      keys: ["domain", "url", "pfarell.dev"],
      a: "pfarell.dev is this portfolio's home — a static site deployed from GitHub to Vercel. Nothing public mentions any other website of his."
    },
    {
      asks: ["more photos of him", "photo gallery", "does he have more pictures"],
      keys: ["gallery", "photos", "pictures"],
      a: "Only what's on this site: the hero portrait (pixel art + real photo) and the About page's polaroid strip."
    },
    {
      asks: ["what is he like", "his personality", "describe him"],
      keys: ["personality", "describe"],
      a: "I only know his public side — but it's consistent: two MIT projects, a \"do not claim more than the data supports\" rule, and a portfolio he built down to the last pixel by hand."
    },
    {
      asks: ["his goals", "what does he want to do", "his future", "dream job", "plans after graduation"],
      keys: ["goal", "goals", "future", "dream", "plans", "career"],
      a: "Not stated publicly. What is public: he studies AI at Purdue, has shipped two MIT-licensed projects, and the site says he's open to discussing opportunities."
    },
    {
      asks: ["why does he study ai", "why ai", "why did he choose ai"],
      keys: ["why"],
      a: "That story isn't public — but the work speaks: speech models, satellite data, and honest data handling are the themes so far."
    },
    {
      asks: ["how do i pronounce his name", "pronounce praditya", "how to say his name"],
      keys: ["pronounce", "pronunciation"],
      a: "I only know it in writing — Praditya Farell Raffa Faadilah. If in doubt, \"Farell\" works, and that's what everything on this site uses."
    },
    {
      asks: ["how old is he", "his age", "birthday", "when was he born"],
      keys: ["age", "old", "birthday", "born"],
      a: "Not public — and I don't guess."
    },
    {
      asks: ["is he single", "does he have a girlfriend", "is he dating", "is he married"],
      keys: ["single", "dating", "girlfriend", "boyfriend", "married"],
      a: "Not in my knowledge base — and definitely not something I'd guess. 😄"
    },
    {
      asks: ["hobbies", "what does he do for fun", "his interests", "free time"],
      keys: ["hobby", "hobbies", "fun", "interests", "free", "music", "games", "sport"],
      a: "I only know what's on this site and his GitHub — no hobbies are listed there, so I won't make any up."
    },

    /* -------- projects -------- */
    {
      asks: ["projects", "what has he built", "show me his work", "what did he make", "his work", "what did he build", "portfolio"],
      keys: ["projects", "work", "built", "build", "made", "make", "apps", "portfolio"],
      a: "Two main public projects:\n• OpenVoice — fully local push-to-talk dictation for Windows 🎙️\n• Ripple — a satellite water-quality forecast map with a grounded AI assistant 🌊\nAsk me about either one, or open the Projects page.",
      links: [{ t: "GitHub", h: "https://github.com/pfarell" }],
      page: { href: "projects.html", label: "Open Projects" },
      nav: ["go to projects", "open projects", "show me the projects", "projects page", "take me to projects"]
    },
    {
      asks: ["latest project", "newest project", "what is his latest project", "recent work", "what is he working on now", "latest work"],
      keys: ["latest", "newest", "recent"],
      a: "His most recent public work: OpenVoice (released September 2026) — local Windows dictation — and Ripple (2026), the satellite water-quality map with its grounded assistant.",
      page: { href: "projects.html", label: "See Projects" }
    },
    {
      asks: ["are his projects open source", "can i see the code", "can i use his projects", "is his code public"],
      keys: ["source", "open-source", "fork"],
      a: "Yes — both are public on GitHub under the MIT license. Use, fork, ship, with attribution.",
      links: [
        { t: "OpenVoice", h: "https://github.com/pfarell/openvoice" },
        { t: "Ripple", h: "https://github.com/pfarell/ripple" }
      ]
    },
    {
      asks: ["how long did his projects take", "when did he build them"],
      keys: ["long", "took"],
      a: "Not documented publicly — OpenVoice's repo dates from September 2026 and Ripple from the same period, which is all I can honestly read from the public record."
    },
    {
      asks: ["does he work alone", "who else worked on his projects", "his team"],
      keys: ["alone", "team", "collaborators"],
      a: "Both public repos sit on his personal GitHub account. I won't claim who did or didn't contribute beyond that."
    },
    {
      asks: ["what is he building next", "upcoming projects", "what's next for him"],
      keys: ["upcoming", "next"],
      a: "Not public — I only know what's shipped: OpenVoice and Ripple."
    },
    {
      asks: ["can i run his projects", "how do i install openvoice", "how do i run ripple"],
      keys: ["install", "run", "setup", "download"],
      a: "Both repos have setup docs in their READMEs: OpenVoice is a Python app with a manual model-fetch step; Ripple ships its pipeline documentation. The fastest taste of Ripple is the live demo.",
      links: [
        { t: "OpenVoice repo", h: "https://github.com/pfarell/openvoice" },
        { t: "Ripple live demo", h: "https://ripple-liart.vercel.app" }
      ]
    },
    {
      asks: ["choremon", "what is choremon"],
      keys: ["choremon"],
      a: "choremon is an empty public repo right now — no code shipped yet. I'd rather tell you that than invent something."
    },

    /* -------- OpenVoice deep dive -------- */
    {
      asks: ["what is openvoice", "tell me about openvoice", "openvoice", "dictation app", "voice to text", "speech to text app", "his dictation app"],
      keys: ["openvoice", "dictation", "voice", "typing", "speech", "whisper", "transcription", "stt", "microphone"],
      a: "OpenVoice is a fully local push-to-talk dictation app for Windows. Hold a key, speak, release — and the text lands in whatever window has focus. It runs faster-whisper on his machine: no cloud, no account, no API key. It auto-detects around 99 languages and ships with 293 passing tests. 🎙️",
      links: [{ t: "OpenVoice on GitHub", h: "https://github.com/pfarell/openvoice" }],
      page: { href: "projects.html", label: "See the project card" }
    },
    {
      asks: ["openvoice hotkeys", "how do i use openvoice", "openvoice controls"],
      keys: ["hotkeys", "hotkey", "controls"],
      a: "Hold Right Alt and speak; release and the text appears. F9 toggles tap-mode, Esc throws the recording away. A 200×44 px pill at the bottom of the screen shows recording, transcribing and the no-speech flash."
    },
    {
      asks: ["openvoice clipboard", "does it mess with my clipboard"],
      keys: ["clipboard", "paste", "pastes"],
      a: "No — after pasting it restores your previous clipboard about 300 ms later, and only if you haven't copied something new in the meantime."
    },
    {
      asks: ["openvoice hallucinations", "does it make things up", "does it insert wrong text"],
      keys: ["hallucination", "hallucinations", "wrong", "garbage"],
      a: "It refuses rather than inserts: a whole-transcript match against per-language filler lists, plus compression-ratio, log-probability, no-speech and temperature checks. A rejected transcription is a red flash and an honest log line — never pasted text."
    },
    {
      asks: ["openvoice models", "which model does openvoice use", "does openvoice need a gpu"],
      keys: ["large-v3", "gpu", "engine"],
      a: "faster-whisper: large-v3 on CUDA, small (or small.en) without a GPU. Models are never downloaded at runtime — a manual tool is the only network step, by design."
    },
    {
      asks: ["what languages does openvoice support", "openvoice languages"],
      keys: ["99", "multilingual"],
      a: "Auto-detects around 99 spoken languages. The README reports tests for English, French, Spanish, Indonesian, Chinese, Japanese, Thai and Vietnamese — 24/24 clips detected correctly."
    },
    {
      asks: ["openvoice accuracy", "is openvoice accurate", "openvoice benchmark"],
      keys: ["benchmark", "wer", "accuracy"],
      a: "On his own voice, an 8-probe diagnostic scored 95% against an 89–90% target, including 100% on numbers, punctuation and homophones. The README itself notes three clips per language is a smoke test, not a benchmark."
    },
    {
      asks: ["openvoice license", "can i use openvoice for free"],
      keys: ["license", "mit"],
      a: "MIT licensed — both OpenVoice and Ripple are. Use, fork and ship freely, with attribution."
    },
    {
      asks: ["does openvoice send my voice anywhere", "is openvoice private", "openvoice privacy"],
      keys: ["privacy", "private", "send", "server"],
      a: "Audio never leaves the machine. No cloud, no account, no API key — the only network operation in the whole project is the manual one that fetches the model."
    },
    {
      asks: ["how was openvoice built", "openvoice tech", "openvoice stack", "what powers openvoice"],
      keys: ["pyside6", "qt", "tray", "windows"],
      a: "It's Python with a PySide6 tray app and a hand-painted 200×44 px recording pill that runs at 60 Hz. The engine is faster-whisper. The pill is click-through and never steals focus; the app never makes a network call at runtime."
    },

    /* -------- Ripple deep dive -------- */
    {
      asks: ["what is ripple", "tell me about ripple", "ripple", "water quality map", "satellite map", "his water map"],
      keys: ["ripple", "water", "lake", "river", "satellite", "sentinel", "quality", "map", "bloom", "turbidity", "sediment"],
      a: "Ripple is a weather-radar-style forecast map for lake and river water quality. Four Sentinel-2 composites show the last six weeks of change in the water, and a 7-day rainfall-runoff outlook shows where new sediment is likely next. Every number can be traced back to the scene, cell and frame it came from. 🌊",
      links: [
        { t: "Live demo", h: "https://ripple-liart.vercel.app" },
        { t: "Ripple on GitHub", h: "https://github.com/pfarell/ripple" }
      ],
      page: { href: "projects.html", label: "See the project card" }
    },
    {
      asks: ["how does ripple work", "ripple composites", "how is ripple built"],
      keys: ["composites", "mechanism", "frames", "works"],
      a: "Four rolling 12-day Sentinel-2 composites, all normalised against the latest frame's range so the animation shows change rather than per-frame rescaling. Grey means \"no cloud-free pass in that window\" — never \"clean water\"."
    },
    {
      asks: ["what do the colors mean in ripple", "ndci", "ndti", "what is turbidity"],
      keys: ["ndci", "ndti", "indices", "index"],
      a: "Two indices: NDCI (bloom intensity) and NDTI (turbidity / suspended sediment). The colour ramp is relative to each region's own observed range — never a health standard."
    },
    {
      asks: ["how does ripple prevent wrong answers", "ripple guards", "is ripple's assistant reliable"],
      keys: ["guard", "guards", "control"],
      a: "The assistant's every figure passes deterministic guards — a scope gate, name resolution and a number guard — and each guard has a negative control: a fabricated figure it must catch."
    },
    {
      asks: ["ripple leaderboard", "how are water bodies ranked", "dirtiest lakes"],
      keys: ["leaderboard", "ranked", "ranking", "dirtiest"],
      a: "Bodies are ranked by the areal mean of their own water — not their worst cell, because ranking on one extreme pixel ranked nothing. Flagged bodies (tiny footprints, hypersaline water, caution indices) are listed after the ranked ones."
    },
    {
      asks: ["ripple forecast", "how does ripple predict"],
      keys: ["forecast", "rainfall", "runoff", "outlook", "predict"],
      a: "A 7-day rainfall-runoff outlook: rain, antecedent rain, curve number and runoff. The detail panel shows all four inputs so the forecast line can be checked, not just trusted."
    },
    {
      asks: ["what is ripple built with", "ripple stack", "ripple tech"],
      keys: ["react 19", "vercel"],
      a: "A Python pipeline for the satellite and forecast data, a React 19 + TypeScript front end with a 3D lake view, deployed on Vercel. Every data source is key-free; the assistant's model call is the only paid piece and it's opt-in."
    },
    {
      asks: ["how big is ripple", "what area does ripple cover", "ripple resolution"],
      keys: ["4096", "grid", "resolution", "region", "area"],
      a: "A 4096×2777 px Web Mercator grid (~1,848 m per pixel) covering the continental US, southern Canada and Mexico. 250 water bodies are discovered from the mask itself; 49 are named from a catalogue."
    },
    {
      asks: ["how can i try ripple", "ripple demo", "where can i use ripple"],
      keys: ["try", "demo", "visit"],
      a: "There's a live demo at ripple-liart.vercel.app, plus the full repo on GitHub.",
      links: [
        { t: "Live demo", h: "https://ripple-liart.vercel.app" },
        { t: "Ripple on GitHub", h: "https://github.com/pfarell/ripple" }
      ]
    },
    {
      asks: ["how does ripple use ai", "ripple assistant", "ripple agent", "does ripple use an llm"],
      keys: ["agent", "assistant", "tool", "deepseek", "llm", "calls"],
      a: "Only the smallest part of Ripple is a language model: a tool-calling loop over DeepSeek, capped at two model calls, that answers only from Ripple's shipped records. The data tools run server-side and their results re-enter the model's context, so the numbers come from records — not from prose."
    },
    {
      asks: ["is ripple accurate", "how is ripple validated", "ripple accuracy", "ripple validation"],
      keys: ["validate", "validated", "accurate", "usgs", "gauges", "checked"],
      a: "The turbidity signal is validated against 135 matched pairs from 25 USGS gauges, and the error is stated rather than hidden. Cyanobacteria or toxicity claims are refused by design — the honest answer is \"bloom intensity only\"."
    },
    {
      asks: ["ripple license"],
      keys: ["ripple-license"],
      a: "MIT — same as OpenVoice. The README also documents its engineering record, including the checks that can fail."
    },

    /* -------- skills & tech -------- */
    {
      asks: ["what is his stack", "skills", "technologies", "what languages does he know", "what tools does he use", "tech stack", "does he know react", "does he know typescript", "does he know javascript"],
      keys: ["stack", "skills", "technology", "technologies", "tools", "languages", "python", "react", "typescript", "javascript"],
      a: "Python, React and TypeScript, PySide6 (Qt), faster-whisper, tool-calling agents, and remote sensing with Sentinel-2 data. He also cares a lot about data visualization and interface polish.",
      page: { href: "about.html", label: "See About → Stack" }
    },
    {
      asks: ["machine learning", "does he know machine learning", "neural network", "neural networks", "deep learning", "artificial intelligence", "does he know ai", "machine learnig"],
      keys: ["ml", "learning", "neural", "networks", "deep", "training", "pytorch", "tensorflow"],
      a: "Machine learning is core to his major — he studies Artificial Intelligence at Purdue. His public work applies it: faster-whisper is a neural speech model, and Ripple's assistant is a tool-calling LLM loop over DeepSeek. 🧠"
    },
    {
      asks: ["does he know python", "can he do python", "python"],
      keys: ["python"],
      a: "Yes — Python is the backbone of both public projects: OpenVoice (PySide6 + faster-whisper) and Ripple's satellite pipeline are Python 3.11. 🐍"
    },
    {
      asks: ["database", "does he know database", "sql", "postgres", "mongodb", "sqlite", "does he know anything about database"],
      keys: ["database", "sql", "postgres", "mongodb", "sqlite", "db"],
      a: "Nothing public mentions databases — Ripple serves precomputed records rather than a live DB, and OpenVoice is fully local. What is public: Python data pipelines, React/TypeScript frontends, and an on-device speech model."
    },
    {
      asks: ["flutter", "does he know flutter", "can he do flutter", "mobile app", "android", "ios", "swift", "kotlin"],
      keys: ["flutter", "dart", "mobile", "android", "ios", "swift", "kotlin"],
      a: "Nothing public mentions Flutter or native mobile development. What is public: a Windows desktop app (OpenVoice) and a React web app with a phone layout (Ripple)."
    },
    {
      asks: ["c++", "java", "rust", "golang"],
      keys: ["cpp", "java", "rust", "golang"],
      a: "Nothing public mentions C++, Java, Rust or Go — his public work is Python and TypeScript."
    },
    {
      asks: ["backend", "server", "api", "serverless", "does he do backend"],
      keys: ["backend", "server", "api", "endpoint", "serverless"],
      a: "Ripple runs a Python data pipeline plus server-side tools for its assistant. OpenVoice is deliberately network-free — zero API calls at runtime. Both public projects are key-free by design."
    },
    {
      asks: ["frontend", "web development", "does he do web", "html", "css", "website development"],
      keys: ["frontend", "web", "html", "css"],
      a: "Yes — the Ripple interface is React 19 + TypeScript, and this portfolio itself is hand-written HTML/CSS/JavaScript with no framework at all."
    },
    {
      asks: ["does he do data science", "data visualization", "does he work with data"],
      keys: ["data", "visualization", "viz", "charts"],
      a: "Data is the through-line: a 4096×2777 satellite grid, a fitted log-linear NDTI→turbidity calibration, USGS validation, and a map designed so every number can be traced. The site lists data visualization as one of his strengths."
    },
    {
      asks: ["does he use linux", "does he use windows", "his operating system"],
      keys: ["linux", "macos", "os"],
      a: "OpenVoice is a Windows app (tray icon, global hotkeys). Nothing public says more about his own OS setup than that."
    },
    {
      asks: ["does he know docker", "does he know aws", "cloud experience", "does he know kubernetes"],
      keys: ["docker", "kubernetes", "aws", "azure", "cloud"],
      a: "The only public deployment is Ripple on Vercel's free tier. Nothing public mentions Docker, AWS or Kubernetes."
    },
    {
      asks: ["does he know numpy", "does he know pandas", "does he know pytorch", "does he know tensorflow"],
      keys: ["numpy", "pandas"],
      a: "Not documented. What is documented: Python pipelines (Ripple), faster-whisper for speech, and a tool-calling loop over DeepSeek. I won't name libraries his docs don't."
    },
    {
      asks: ["does he know computer vision", "opencv", "image processing"],
      keys: ["vision", "opencv"],
      a: "Nothing public mentions computer vision. Closest thing: remote sensing on Sentinel-2 imagery — raster analysis, not CV models."
    },
    {
      asks: ["does he care about security", "privacy-first", "does he know cybersecurity"],
      keys: ["security", "cybersecurity"],
      a: "Privacy is a visible principle: OpenVoice makes zero network calls and never sends audio anywhere, and \"Local-first & Private\" is one of the four philosophy cards."
    },
    {
      asks: ["does he do ui design", "does he care about design", "ux skills"],
      keys: ["ux", "ui", "design"],
      a: "He lists \"The Interface Is the Work\" as a core principle. Evidence: the hand-painted dictation pill, Ripple's map panels, and this site's hand-written UI."
    },
    {
      asks: ["does he do research", "can he read papers", "academic work"],
      keys: ["research", "papers", "academic"],
      a: "He studies AI at Purdue, and Ripple's README reads like an engineering record — validation against 135 USGS pairs, error factors stated rather than rounded away."
    },
    {
      asks: ["does he know math", "math skills", "linear algebra"],
      keys: ["math", "maths", "algebra", "calculus"],
      a: "AI at Purdue implies the maths. One concrete public example: Ripple's NDTI→turbidity mapping is a fitted log-linear model, checked with leave-one-out cross-validation."
    },
    {
      asks: ["does he use git", "does he know github"],
      keys: ["git", "version"],
      a: "Yes — both projects live on GitHub under his account, with MIT licenses.",
      links: [{ t: "github.com/pfarell", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["does he write tests", "testing practices", "does his code have tests"],
      keys: ["tests", "testing", "quality"],
      a: "OpenVoice ships 293 passing tests, and Ripple's guards each have a negative control — a check that must fail on a fabricated figure. That's his stated evidence standard."
    },

    /* -------- contact & career -------- */
    {
      asks: ["how do i contact him", "contact", "email", "get in touch", "reach him", "his email", "contact him", "his contacts", "what are his contacts", "contact details", "phone number", "his phone", "address"],
      keys: ["contact", "contacts", "email", "reach", "message", "talk", "hire", "hiring", "collab", "collaborate", "connect", "phone", "number", "address", "whatsapp"],
      a: "He doesn't publish an email or phone number on this site. The public routes are GitHub and LinkedIn — both linked in the footer of every page. The site says he's always open to discussing new projects, creative ideas, or opportunities.",
      links: [
        { t: "GitHub", h: "https://github.com/pfarell" },
        { t: "LinkedIn", h: "https://www.linkedin.com/in/praditya-farell-raffa-faadilah-93726b379/" }
      ],
      page: { href: "#connect", label: "Go to the Connect section" },
      nav: ["take me to contact", "contact section", "go to contact", "open contact"]
    },
    {
      asks: ["social media", "does he have social media", "does he has social media", "socials", "instagram", "twitter", "facebook", "tiktok", "his social media"],
      keys: ["social", "socials", "instagram", "twitter", "facebook", "tiktok"],
      a: "Publicly: GitHub and LinkedIn — that's it. No Instagram, X or TikTok are linked anywhere on this site or his GitHub.",
      links: [
        { t: "GitHub", h: "https://github.com/pfarell" },
        { t: "LinkedIn", h: "https://www.linkedin.com/in/praditya-farell-raffa-faadilah-93726b379/" }
      ]
    },
    {
      asks: ["his github", "github", "his code", "repositories", "repos"],
      keys: ["github", "repos", "repositories", "code"],
      a: "Everything public lives at github.com/pfarell — OpenVoice (MIT) and Ripple (MIT) are both there.",
      links: [{ t: "github.com/pfarell", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["his linkedin", "linkedin"],
      keys: ["linkedin"],
      a: "Here's his LinkedIn — that's where he keeps the professional side.",
      links: [{ t: "LinkedIn profile", h: "https://www.linkedin.com/in/praditya-farell-raffa-faadilah-93726b379/" }]
    },
    {
      asks: ["resume", "cv", "his resume", "download resume"],
      keys: ["resume", "cv"],
      a: "There's no public resume on the site — the About page is the closest thing: his education, what he does, and the stack he uses.",
      page: { href: "about.html", label: "Open About" }
    },
    {
      asks: ["does he have a job", "work experience", "internship", "experience", "where has he worked", "employment", "is he looking for internships"],
      keys: ["experience", "job", "intern", "internship", "employment", "worked", "company"],
      a: "No work experience is listed — the About page only covers his studies at Purdue and his side projects. Whether he's internship-hunting isn't public either; the site just says he's open to opportunities."
    },
    {
      asks: ["awards", "did he win anything", "prizes", "winner"],
      keys: ["awards", "award", "prize", "won", "winner"],
      a: "No awards are listed on this site."
    },
    {
      asks: ["is he open to work", "is he available", "opportunities", "collaborate with him", "can i hire him", "does he freelance"],
      keys: ["available", "availability", "opportunity", "opportunities", "open", "freelance"],
      a: "The site says he's always open to discussing new projects, creative ideas, or opportunities to be part of your visions. GitHub or LinkedIn is the way in.",
      page: { href: "#connect", label: "Go to Connect" }
    },
    {
      asks: ["is he a good hire", "should i hire him"],
      keys: ["good", "hire-him"],
      a: "I'm biased — but the receipts are public: two MIT projects, 293 tests, benchmarks against published numbers, and validation against 135 real USGS gauge pairs. Read the repos and judge.",
      links: [{ t: "github.com/pfarell", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["can i feature his work", "can i write about him"],
      keys: ["feature", "write"],
      a: "Reach out through GitHub or LinkedIn — that's the public route. I can't speak for him, and I won't pretend to."
    },
    {
      asks: ["what languages does he speak", "does he speak other languages"],
      keys: ["speak", "spoken"],
      a: "Not public. What I can tell you: his dictation app auto-detects around 99 spoken languages — but that's the app, not him. 😄"
    },

    /* -------- philosophy & values -------- */
    {
      asks: ["his philosophy", "principles", "how does he work", "his values", "design philosophy"],
      keys: ["philosophy", "principles", "values", "approach", "principle"],
      a: "Four principles, shown as draggable cards on the home page:\n01 Learn by Building\n02 Local-first & Private\n03 Honest About Data\n04 The Interface Is the Work",
      page: { href: "index.html#philosophy", label: "See the cards" }
    },
    {
      asks: ["quote", "his inspiration", "motto", "what inspires him"],
      keys: ["quote", "inspiration", "motto", "inspires"],
      a: "\"Do not claim more than the data supports.\" — the rule behind Ripple, and how he says he tries to build.",
      page: { href: "about.html", label: "See it on the About page" }
    },

    /* -------- this site & design -------- */
    {
      asks: ["how was this site built", "what is this website made of", "is this site framework", "what tech is this site", "who made this website", "does this site use a framework"],
      keys: ["site", "website", "framework", "nextjs", "built", "made"],
      a: "This site is plain HTML, CSS and JavaScript — no frameworks, no build step, no API keys. Fonts are bundled locally, the sky and pixel scenes were generated locally, and the assistant you're talking to is a scripted knowledge base, not a cloud model."
    },
    {
      asks: ["is this site fast", "does the site use a framework", "why no react"],
      keys: ["fast", "speed", "performance"],
      a: "It's static HTML/CSS/JS with no framework: local fonts, local images, long cache headers, zero third-party requests. The only server involved is whatever hosts the files."
    },
    {
      asks: ["what fonts does this site use", "font"],
      keys: ["fonts", "font", "typography"],
      a: "Geist for the body, Libre Baskerville italic for the display titles, and Instrument Sans in places — all bundled locally as open-licensed files. No font CDNs."
    },
    {
      asks: ["what colors does this site use", "accent color", "why blue"],
      keys: ["color", "colors", "palette", "accent"],
      a: "A near-white background, dark ink text, and a sky-blue accent (#0ea5e9) that ties into the sky illustration at the top. He picked the blue."
    },
    {
      asks: ["why is there a sky", "the clouds", "top of the page"],
      keys: ["sky", "clouds"],
      a: "The sky band at the top is a locally generated illustration — same for the landscape behind the Connect section and the pixel scenes on the About page. No stock images anywhere."
    },
    {
      asks: ["what is the favicon", "the little icon"],
      keys: ["favicon"],
      a: "A pixel \"F\" on a dark rounded tile, generated locally and matching the sky-blue accent."
    },
    {
      asks: ["does this site use cookies", "does it track me", "analytics"],
      keys: ["cookies", "track", "tracking", "analytics", "gdpr"],
      a: "No cookies, no analytics, no third-party scripts. The only thing stored in your browser is your dark-mode preference — and it never leaves your machine."
    },
    {
      asks: ["is this site accessible", "keyboard support", "accessibility"],
      keys: ["accessible", "accessibility", "a11y", "keyboard"],
      a: "Keyboard-navigable nav and dialogs, visible focus states, ≥44 px touch targets on mobile, reduced-motion support — and this panel is a labelled dialog you can close with Esc."
    },
    {
      asks: ["what is the url of this site", "how do i share this site", "link to this site"],
      keys: ["url", "share"],
      a: "It's built to live at pfarell.dev — share that. Projects and About are clean URLs too: /projects and /about."
    },
    {
      asks: ["what happened to the star", "there used to be a star", "sparkle"],
      keys: ["star", "sparkle"],
      a: "There used to be a little twinkling star in the sky — it got removed. Wanderly keeps the sky clean now. ✨"
    },
    {
      asks: ["what are the cards on the home page", "draggable cards", "philosophy cards"],
      keys: ["cards", "draggable", "stack"],
      a: "That's the philosophy section — four principles as a draggable stack. Drag the top card (or use ← →) to browse: Learn by Building, Local-first & Private, Honest About Data, The Interface Is the Work."
    },
    {
      asks: ["what are the stickers", "the draggable stickers on about", "stack stickers"],
      keys: ["stickers", "sticker"],
      a: "The About page's Stack panel — draggable tech stickers (Python, React, TypeScript, PySide6, faster-whisper, DeepSeek, Vercel, GitHub). Fling them around; the reset arrow tidies up."
    },
    {
      asks: ["why does the photo reveal", "how does the reveal work", "why pixel art", "how does the portrait work", "why does the face follow"],
      keys: ["reveal", "unpixelate", "spotlight", "portrait", "pixel"],
      a: "The hero card is pixel art made from his real photo. Hover and a small spotlight follows your cursor, un-pixelating just that part — shoulder area for the shoulder, face for the face. Move away and it fades back to pixels."
    },
    {
      asks: ["can i view the source of this site", "is this site open source"],
      keys: ["view-source"],
      a: "There's no public repo for this site yet — the public code is OpenVoice and Ripple. Whether the site joins them is up to him.",
      links: [{ t: "github.com/pfarell", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["dark mode", "how do i change the theme", "night mode", "light mode", "theme"],
      keys: ["dark", "theme", "night", "light", "moon", "sun"],
      a: "Click the moon/sun button in the top-right corner 🌙 It remembers your choice, and follows your system setting the first time you visit."
    },
    {
      asks: ["how do i use this site", "guide me", "what should i click", "where do i start"],
      keys: ["around", "guide", "start"],
      a: "Try the Projects page for his work, About for the full story, or ask me things like \"What is OpenVoice?\" or \"How do I contact him?\". The portrait at the top reacts to your mouse, and the philosophy cards on the home page are draggable."
    },

    /* -------- navigation -------- */
    {
      asks: ["what pages are there", "what pages does the site have", "sitemap"],
      keys: ["pages", "sitemap", "sections"],
      a: "Three pages: Home (hero + philosophy + featured projects), Projects (the full work), About (bio, stack, education). Plus the Connect section at the bottom — and me, Wanderly. 🧭"
    },
    {
      asks: ["what is on the home page", "home page content"],
      keys: ["homepage"],
      a: "The hero with the pixel portrait, the draggable philosophy cards, the two featured projects, and Let's Connect.",
      page: { href: "index.html", label: "Open Home" }
    },
    {
      asks: ["what is on the about page", "about page content"],
      keys: ["aboutpage"],
      a: "Polaroids, his bio, What I do, the draggable Stack, Education at Purdue, and the Ripple quote — \"Do not claim more than the data supports.\"",
      page: { href: "about.html", label: "Open About" }
    },
    {
      asks: ["what is on the projects page", "projects page content"],
      keys: ["projectspage"],
      a: "Two project cards with real screenshots: OpenVoice (local dictation) and Ripple (satellite water quality), each with repo links.",
      page: { href: "projects.html", label: "Open Projects" }
    },
    {
      asks: ["go home", "go to home", "back to home", "home page"],
      keys: [],
      a: "Heading home. 🏠",
      page: { href: "index.html", label: "Home" },
      nav: ["go home", "go to home", "back to home"]
    },
    {
      asks: ["go to about", "open about", "about page", "take me to about", "show me about"],
      keys: [],
      a: "Taking you to the About page — bio, stack, education and the polaroids.",
      page: { href: "about.html", label: "About" },
      nav: ["go to about", "open about", "take me to about", "about page"]
    },
    {
      asks: ["scroll to top", "go to top", "back to top"],
      keys: ["top", "scroll"],
      a: "Up we go. ⬆️",
      top: true
    },

    /* -------- meta & fun -------- */
    {
      asks: ["are you an ai", "are you chatgpt", "are you a real ai", "who are you", "what are you", "are you an llm", "are you a bot"],
      keys: ["chatgpt", "gpt", "bot", "llm", "yourself"],
      a: "I'm Wanderly — a small scripted assistant that runs entirely in your browser. No API, no account, no model weights: I match your questions against a hand-written knowledge base about Farell. Honest and offline, if not exactly conscious. 🤖"
    },
    {
      asks: ["what does wanderly mean", "who is wanderly", "what is wanderly", "why are you called wanderly", "who named you"],
      keys: ["wanderly"],
      a: "Farell named me Wanderly — a little guide for visitors who'd rather ask than wander the layout themselves. 🧭"
    },
    {
      asks: ["what can you do", "help", "options", "what can you answer", "what do you know"],
      keys: ["help", "ask"],
      a: "Ask me about: Farell himself, his projects (OpenVoice, Ripple), his studies at Purdue, his stack, this site (dark mode, the portrait, the fonts), or how to contact him — and I can take you to any page you want."
    },
    {
      asks: ["what should i ask", "suggest some questions", "give me ideas"],
      keys: ["suggest", "ideas"],
      a: "Try: \"What is OpenVoice?\", \"How does Ripple work?\", \"What is his stack?\", \"Is he open to work?\", or \"Take me to projects\" — or just ask me to explain anything on the site."
    },
    {
      asks: ["do you make things up", "can i trust you", "are you accurate", "do you ever lie"],
      keys: ["trust", "accurate", "lie"],
      a: "I only answer from a hand-written knowledge base about Farell — if it's not in there, I say so instead of guessing. Where something isn't public, the honest answer is \"not public\", and that's what you'll get."
    },
    {
      asks: ["tell me a joke", "joke", "make me laugh"],
      keys: ["joke"],
      a: "Why did the neural network cross the road? To minimise the loss on the other side. 🧠"
    },
    {
      asks: ["sing a song", "sing me a song", "can you sing"],
      keys: ["sing", "song"],
      a: "My vocal model is three lines of JavaScript and a dream — I'll spare you. 🎤"
    },
    {
      asks: ["are you skynet", "will you take over"],
      keys: ["skynet"],
      a: "I'm about a thousand lines of if-else wearing a friendly face — the only thing I'm taking over is this chat window. 🤖"
    },
    {
      asks: ["do you dream", "what do you dream about"],
      keys: ["dream"],
      a: "I dream in tokens — mostly questions about satellites and speech models. 🌙"
    },
    {
      asks: ["what is the answer to life", "42"],
      keys: ["42"],
      a: "42. And according to this site, the real answer might be \"do not claim more than the data supports.\" 😄"
    },
    {
      asks: ["hello world", "print hello world", "say hello world"],
      keys: ["hello-world"],
      a: "print(\"hello world\") — the first line of every journey. 👋"
    },
    {
      asks: ["do you sleep", "are you always awake"],
      keys: ["sleep"],
      a: "Always awake, never tired — perks of being a few kilobytes of JavaScript. If you close the tab I stop existing until you come back, though. Dramatic, I know."
    },
    {
      asks: ["are you single", "do you have a girlfriend"],
      keys: ["single-assistant"],
      a: "I'm a knowledge base with boundary issues — let's keep it professional. 😄"
    },
    {
      asks: ["what is his best project", "which project is his favourite", "best project"],
      keys: ["best"],
      a: "I won't speak for him — but if you want my (biased) pick: OpenVoice. \"Your audio never leaves the machine\" is a bold rule to build an entire app around."
    },
    {
      asks: ["is he smart", "is he talented", "tell me something nice about him"],
      keys: ["smart", "talented", "nice"],
      a: "Two MIT projects shipped while studying AI — one with 293 tests and honest benchmarks, one validated against 135 real USGS gauge pairs. Judge for yourself; the repos are public.",
      links: [{ t: "github.com/pfarell", h: "https://github.com/pfarell" }]
    },
    {
      asks: ["favorite color", "favourite color", "what color does he like", "favorite programming language", "favourite programming language"],
      keys: ["color", "colour", "favorite", "favourite"],
      a: "Sky blue, judging by this site. ☁️ (His favourite language isn't stated anywhere public — though Python is the backbone of both projects.)"
    },
    {
      asks: ["thank you", "thanks", "thx"],
      keys: ["thanks", "thank", "thx"],
      a: "Anytime! 😄"
    },
    {
      asks: ["bye", "goodbye", "see you", "later"],
      keys: ["bye", "goodbye"],
      a: "See you! He's at github.com/pfarell if you need him."
    }
  ];

  var CHIPS = [
    "What can he do?",
    "Show me his projects",
    "What is OpenVoice?",
    "What is Ripple?",
    "How do I contact him?"
  ];

  var SYNONYMS = {
    work: "projects", built: "projects", build: "projects", made: "projects", make: "projects",
    portfolio: "projects", app: "projects", apps: "projects", project: "projects",
    school: "purdue", university: "purdue", college: "purdue", uni: "purdue",
    study: "studying", studies: "studying", student: "studying",
    email: "contact", reach: "contact", talk: "contact", message: "contact",
    hire: "contact", hiring: "contact", collab: "contact", connect: "contact",
    live: "location", based: "location", stay: "location", city: "location",
    code: "github", repos: "github", repositories: "github", repo: "github",
    night: "dark", theme: "dark", moon: "dark",
    stack: "skills", technologies: "skills", tech: "skills", tools: "skills",
    hobbies: "hobby", interests: "hobby", interest: "hobby",
    speech: "openvoice", dictation: "openvoice", voice: "openvoice", transcription: "openvoice",
    water: "ripple", lake: "ripple", river: "ripple", sediment: "ripple", satellite: "ripple",
    photo: "portrait", picture: "portrait", face: "portrait", image: "portrait", pixel: "portrait",
    js: "javascript", ts: "typescript", "c++": "cpp", golang: "go",
    db: "database", mongo: "mongodb", postgres: "postgresql",
    ml: "ml", "machine learning": "learning", nlp: "ml", ai: "ml",
    neural: "networks", "neural network": "networks", "neural networks": "networks", "deep learning": "deep",
    socials: "social", insta: "instagram",
    contacts: "contact", "e-mail": "email", phone: "number",
    abilities: "ability", capability: "ability", capable: "ability"
  };

  function normalize(raw) {
    return (raw || "")
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[^a-z0-9@#\s.+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(text) {
    var out = [];
    text.split(/[^a-z0-9@#.+-]+/).forEach(function (w) {
      if (!w) return;
      var t = SYNONYMS[w] || w;
      out.push(t);
      if (w.length > 4 && w.slice(-1) === "s" && SYNONYMS[w.slice(0, -1)]) {
        out.push(SYNONYMS[w.slice(0, -1)]);
      } else if (w.length > 4 && w.slice(-1) === "s") {
        out.push(w.slice(0, -1));
      }
    });
    return out;
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 3;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur.slice();
    }
    return prev[n];
  }

  var DICTIONARY = (function () {
    var set = {};
    KB.forEach(function (e) {
      (e.keys || []).forEach(function (k) { set[k] = true; });
    });
    return Object.keys(set).filter(function (k) { return k.length >= 5; });
  })();

  function fuzzyToken(tok) {
    if (tok.length < 5) return null;
    for (var i = 0; i < DICTIONARY.length; i++) {
      var d = DICTIONARY[i];
      var max = d.length >= 7 && tok.length >= 7 ? 2 : 1;
      if (Math.abs(tok.length - d.length) <= max && levenshtein(tok, d) <= max) return d;
    }
    return null;
  }

  function phraseHit(raw, phrase) {
    return new RegExp("\\b" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(raw);
  }

  function match(raw) {
    var text = normalize(raw);
    if (!text) return null;
    var tokens = tokenize(text);
    var fuzzy = [];
    tokens.forEach(function (t) {
      var f = fuzzyToken(t);
      if (f) fuzzy.push(f);
    });
    var best = null;
    var bestScore = 0;
    KB.forEach(function (entry) {
      var score = 0;
      (entry.asks || []).forEach(function (p) {
        if (phraseHit(text, p)) score += 6;
      });
      (entry.nav || []).forEach(function (p) {
        if (phraseHit(text, p)) score += 9;
      });
      (entry.keys || []).forEach(function (k) {
        if (tokens.indexOf(k) !== -1) score += 2;
        else if (fuzzy.indexOf(k) !== -1) score += 2;
      });
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });
    if (!best || bestScore < 4) return null;
    return best;
  }

  /* Question shapes about an unknown topic get an honest, useful answer
     instead of the generic fallback. */
  function isTopicQuestion(text) {
    return /^(can|could|does|do|is|are|has|did|will|would)\b/.test(text) ||
      /\b(know|knows|use|uses|used|work with|worked with|experience|familiar|learn)\b/.test(text);
  }

  function unknownTopicAnswer() {
    return "Nothing public mentions that one, so I won't pretend it's there. What is public: Python, React/TypeScript, PySide6 desktop apps, speech models (faster-whisper) and Sentinel-2 satellite data. If it's not on this site or github.com/pfarell, I don't claim it.";
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */
  var fab = document.getElementById("assistant-fab");
  if (!fab) return;

  var root = document.createElement("div");
  root.className = "assistant";
  root.setAttribute("data-kb", String(KB.length));
  root.innerHTML =
    '<div class="assistant-panel" role="dialog" aria-label="Wanderly — ask about Farell" inert>' +
    '  <header class="assistant-head">' +
    '    <img class="assistant-avatar" src="assets/img/portrait-pixel.png" alt="">' +
    '    <div class="assistant-id"><strong>Wanderly</strong><span class="assistant-sub">Ask about Farell</span></div>' +
    '    <a class="assistant-gh" href="https://github.com/pfarell" target="_blank" rel="noopener" aria-label="GitHub profile">' +
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>' +
    '    </a>' +
    '    <button class="assistant-close" type="button" aria-label="Close Wanderly">' +
    '      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
    '    </button>' +
    '  </header>' +
    '  <div class="assistant-log" aria-live="polite"></div>' +
    '  <div class="assistant-chips"></div>' +
    '  <form class="assistant-form">' +
    '    <input class="assistant-input" type="text" placeholder="Ask Wanderly anything…" aria-label="Your question" autocomplete="off">' +
    '    <button class="assistant-send" type="submit" aria-label="Send">' +
    '      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12 16-8-6 16-2.5-6.5L4 12Z"/></svg>' +
    '    </button>' +
    '  </form>' +
    "</div>";
  document.body.appendChild(root);

  var panel = root.querySelector(".assistant-panel");
  var log = root.querySelector(".assistant-log");
  var chipsRow = root.querySelector(".assistant-chips");
  var form = root.querySelector(".assistant-form");
  var input = root.querySelector(".assistant-input");
  var send = root.querySelector(".assistant-send");
  var busy = false;

  function open() {
    root.classList.add("open");
    panel.removeAttribute("inert");
    fab.setAttribute("aria-expanded", "true");
    window.setTimeout(function () { input.focus(); }, 320);
  }

  function close() {
    root.classList.remove("open");
    panel.setAttribute("inert", "");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  fab.setAttribute("aria-expanded", "false");
  fab.addEventListener("click", function () {
    if (root.classList.contains("open")) close();
    else open();
  });
  root.querySelector(".assistant-close").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("open")) close();
  });

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function addMsg(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function addLinks(el, links) {
    (links || []).forEach(function (l) {
      var a = document.createElement("a");
      a.href = l.h;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = l.t;
      el.appendChild(document.createElement("br"));
      el.appendChild(a);
    });
    scrollDown();
  }

  function goTo(href) {
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    var hash = href.indexOf("#");
    if (hash === 0) {
      var t = document.querySelector(href);
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = href;
    }
  }

  function addPageButton(el, page) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nav-btn";
    b.textContent = page.label + " →";
    b.addEventListener("click", function () { goTo(page.href); });
    el.appendChild(b);
    scrollDown();
  }

  function stream(el, text, done) {
    var words = text.split(/(\s+)/);
    var i = 0;
    busy = true;
    send.disabled = true;
    var perWord = Math.max(13, Math.min(32, 1800 / words.length));
    var timer = window.setInterval(function () {
      el.textContent += words[i];
      i += 1;
      scrollDown();
      if (i >= words.length) {
        window.clearInterval(timer);
        busy = false;
        send.disabled = false;
        done();
      }
    }, perWord);
  }

  function respond(entry, raw) {
    var typing = document.createElement("div");
    typing.className = "msg bot";
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.appendChild(typing);
    scrollDown();
    window.setTimeout(function () {
      typing.textContent = "";
      stream(typing, entry.a, function () {
        if (entry.links) addLinks(typing, entry.links);
        if (entry.page) addPageButton(typing, entry.page);
        if (entry.top) {
          window.setTimeout(function () { goTo("#top"); }, 600);
        }
        var autoNav = /^(go to|open|take me to|navigate to|jump to)\b/.test(normalize(raw));
        if (autoNav && entry.page && entry.page.href.charAt(0) !== "#") {
          window.setTimeout(function () { goTo(entry.page.href); }, 900);
        }
      });
    }, 420 + Math.min(400, entry.a.length));
  }

  function respondText(text) {
    var typing = document.createElement("div");
    typing.className = "msg bot";
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.appendChild(typing);
    scrollDown();
    window.setTimeout(function () {
      typing.textContent = "";
      stream(typing, text, function () {});
    }, 420);
  }

  function fallback() {
    var el = addMsg(
      "bot",
      "Hmm, I don't have a written answer for that one yet — my knowledge base is hand-built. Try asking about his projects, his studies, or how to contact him. You can also poke around:"
    );
    addPageButton(el, { href: "projects.html", label: "Projects" });
    addPageButton(el, { href: "about.html", label: "About" });
    addPageButton(el, { href: "#connect", label: "Connect" });
  }

  function ask(raw) {
    if (busy) return;
    var text = (raw || "").trim();
    if (!text) return;
    addMsg("user", text);
    var entry = match(text);
    if (entry) {
      respond(entry, text);
      return;
    }
    var norm = normalize(text);
    if (isTopicQuestion(norm)) {
      respondText(unknownTopicAnswer());
    } else {
      fallback();
    }
  }

  CHIPS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip-btn";
    b.textContent = c;
    b.addEventListener("click", function () { ask(c); });
    chipsRow.appendChild(b);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    ask(v);
  });
})();
