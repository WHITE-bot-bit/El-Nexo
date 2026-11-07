
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const ROOT_DIR = __dirname;
const EXAMPLES_DIR = path.join(ROOT_DIR, "examples");
const PLAYGROUND_DIR = path.join(ROOT_DIR, "playground");
const SRC_DIR = path.join(ROOT_DIR, "src");

const PORT = 5500;

// Ollama configuration
const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";
const AI_MODEL = "qwen2.5-coder:3b";

// Allowed browser origins
const ALLOWED_ORIGINS = new Set([
  "https://el-nexo-developer-studio.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
]);

// AI protection settings
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_AI_REQUESTS_PER_WINDOW = 10;
const MAX_CONCURRENT_AI_REQUESTS = 2;
const MAX_TRACKED_IPS = 5000;

const MAX_PROMPT_LENGTH = 10000;
const MAX_CONTEXT_LENGTH = 20000;
const MAX_FILENAME_LENGTH = 200;

const requestCounts = new Map();
let activeAIRequests = 0;
let cleanupCounter = 0;

// --------------------------------------------------
// CORS PROTECTION
// --------------------------------------------------

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({
      success: false,
      error: "Origin not allowed.",
    });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// --------------------------------------------------
// REQUEST BODY PROTECTION
// --------------------------------------------------

app.use(express.json({
  limit: "64kb",
  strict: true,
}));

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

function getClientIP(req) {
  // Cloudflare supplies this header for requests
  // passing through its network.
  const cloudflareIP = req.headers["cf-connecting-ip"];

  if (typeof cloudflareIP === "string" && cloudflareIP.trim()) {
    return cloudflareIP.trim().slice(0, 100);
  }

  return (
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function cleanupRateLimitRecords(now) {
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.startTime >= RATE_LIMIT_WINDOW) {
      requestCounts.delete(ip);
    }
  }
}

function aiRateLimit(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();

  cleanupCounter++;

  // Periodically remove expired records.
  if (cleanupCounter >= 100) {
    cleanupRateLimitRecords(now);
    cleanupCounter = 0;
  }

  let record = requestCounts.get(ip);

  if (!record || now - record.startTime >= RATE_LIMIT_WINDOW) {
    record = {
      startTime: now,
      count: 0,
    };
  }

  if (record.count >= MAX_AI_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - record.startTime)) / 1000
    );

    res.setHeader("Retry-After", retryAfter);

    return res.status(429).json({
      success: false,
      error: "Too many AI requests. Please try again later.",
    });
  }

  // Keep the map bounded against excessive unique IPs.
  if (!requestCounts.has(ip) && requestCounts.size >= MAX_TRACKED_IPS) {
    const oldestIP = requestCounts.keys().next().value;

    if (oldestIP) {
      requestCounts.delete(oldestIP);
    }
  }

  record.count++;
  requestCounts.set(ip, record);

  next();
}

// --------------------------------------------------
// EXAMPLE FILE DISCOVERY
// --------------------------------------------------

async function readExampleDirectory(directory) {
  const entries = await fs.promises.readdir(directory, {
    withFileTypes: true,
  });

  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        type: "folder",
        children: await readExampleDirectory(fullPath),
      });
    } else if (/\.(js|jsx|css)$/.test(entry.name)) {
      result.push({
        name: entry.name,
        type: "file",
        path: path.relative(ROOT_DIR, fullPath)
          .split(path.sep)
          .join("/"),
      });
    }
  }

  return result;
}

// --------------------------------------------------
// API: EXAMPLE TREE
// --------------------------------------------------

app.get("/api/examples", async (req, res) => {
  try {
    if (!fs.existsSync(EXAMPLES_DIR)) {
      return res.json([]);
    }

    const tree = await readExampleDirectory(EXAMPLES_DIR);

    res.json(tree);
  } catch (error) {
    console.error("Example discovery failed:", error.message);

    res.status(500).json({
      error: "Could not discover example files.",
    });
  }
});

// --------------------------------------------------
// API: OLLAMA HEALTH CHECK
// --------------------------------------------------

app.get("/api/ai/health", async (req, res) => {
  try {
    const response = await fetch(OLLAMA_TAGS_URL, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error("Ollama is not responding.");
    }

    const data = await response.json();

    const modelAvailable = data.models?.some(
      (model) =>
        model.name === AI_MODEL ||
        model.name.startsWith(`${AI_MODEL}:`)
    );

    res.setHeader("Cache-Control", "no-store");

    res.json({
      connected: true,
      provider: "Ollama",
      model: AI_MODEL,
      modelAvailable: Boolean(modelAvailable),
    });
  } catch (error) {
    console.error("Ollama health check failed:", error.message);

    res.status(503).json({
      connected: false,
      modelAvailable: false,
      error: "Could not connect to Ollama. Make sure it is running.",
    });
  }
});

// --------------------------------------------------
// API: EL NEXO AI ASSISTANT
// --------------------------------------------------

app.post("/api/ai/explain", aiRateLimit, async (req, res) => {
  if (activeAIRequests >= MAX_CONCURRENT_AI_REQUESTS) {
    return res.status(503).json({
      success: false,
      error: "AI is currently busy. Please try again shortly.",
    });
  }

  const {
    prompt,
    context = "",
    fileName = "Current project",
  } = req.body || {};

  // Validate prompt
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid question.",
    });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      success: false,
      error: "Question is too long.",
    });
  }

  // Validate source context
  if (
    typeof context !== "string" ||
    context.length > MAX_CONTEXT_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      error: "Code context must be under 20,000 characters.",
    });
  }

  // Validate file name
  if (
    typeof fileName !== "string" ||
    fileName.length > MAX_FILENAME_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid file name.",
    });
  }

  activeAIRequests++;

  try {
    console.log("\n========== EL NEXO AI ==========");
    console.log("AI request received.");
    console.log("Context length:", context.length);

    const systemPrompt = `
You are El Nexo AI, the coding assistant inside El Nexo Developer Studio.

El Nexo is a frontend framework built from scratch.

YOUR RESPONSIBILITIES:
- Explain actual El Nexo implementation.
- Explain Virtual DOM, reconciliation and Fiber.
- Explain Hooks and component rendering.
- Help debug supplied source code.

STRICT RULES:
1. Use supplied source code as the primary reference.
2. Never assume the project uses React.
3. Never invent functions or features.
4. Use simple, technically accurate language.
5. Answer only what the user asks.
6. Do not repeat information.
7. If context is insufficient, say so.

RESPONSE RULES:
- Keep answers under approximately 100 words.
- Prefer 3-5 short bullet points when useful.
- Avoid long introductions and conclusions.
- Include code only when requested.
- Do not suggest unrelated next steps.

SELECTED FILE:
${fileName}

SOURCE CODE:
${context || "No source code context was supplied."}
`;

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: AI_MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt.trim(),
          },
        ],
        options: {
          temperature: 0.2,
          num_predict: 180,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const answer = data.message?.content?.trim();

    if (!answer || typeof answer !== "string") {
      throw new Error("Ollama returned an invalid response.");
    }

    console.log("AI response generated successfully.");
    console.log("Response length:", answer.length);

    res.setHeader("Cache-Control", "no-store");

    res.json({
      success: true,
      answer,
      model: AI_MODEL,
      provider: "Ollama",
      contextProvided: Boolean(context.trim()),
      fileName,
    });
  } catch (error) {
    console.error("El Nexo AI error:", error.message);

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: "AI service is unavailable. Check Ollama and the installed model.",
      });
    }
  } finally {
    activeAIRequests--;
  }
});

// --------------------------------------------------
// STATIC FILES
// --------------------------------------------------

app.use("/playground", express.static(PLAYGROUND_DIR));
app.use("/examples", express.static(EXAMPLES_DIR));
app.use("/src", express.static(SRC_DIR));

// --------------------------------------------------
// JSON ERROR HANDLING
// --------------------------------------------------

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Request payload is too large.",
    });
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON request body.",
    });
  }

  console.error("Server error:", error.message);

  res.status(500).json({
    success: false,
    error: "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log("------------------------------------");
  console.log("       EL NEXO DEVELOPER STUDIO");
  console.log("------------------------------------");
  console.log(`Server running: http://localhost:${PORT}/playground/`);
  console.log("Dynamic example discovery: enabled");
  console.log(`AI provider: Ollama (${AI_MODEL})`);
  console.log("AI response limit: 180 tokens");
  console.log("AI API: /api/ai/explain");
  console.log("AI rate limit: 10 requests per minute per IP");
  console.log("AI concurrency limit: 2 requests");
  console.log("Maximum tracked IPs:", MAX_TRACKED_IPS);
  console.log("JSON payload limit: 64kb");
  console.log("Public static directories: restricted");
});
