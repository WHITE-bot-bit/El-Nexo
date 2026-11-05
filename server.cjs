
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const ROOT_DIR = __dirname;
const EXAMPLES_DIR = path.join(ROOT_DIR, "examples");

const PORT = 5500;

// Ollama Configuration
const OLLAMA_URL = "http://localhost:11434/api/chat";
const AI_MODEL = "qwen2.5-coder:3b";

app.use(express.json({ limit: "1mb" }));

// Recursively Discover Example Files
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

// API: Dynamic Example Tree
app.get("/api/examples", async (req, res) => {
  try {
    if (!fs.existsSync(EXAMPLES_DIR)) {
      return res.json([]);
    }

    const tree = await readExampleDirectory(EXAMPLES_DIR);
    res.json(tree);
  } catch (error) {
    console.error("Example discovery failed:", error);

    res.status(500).json({
      error: "Could not discover example files.",
    });
  }
});

// API: Check Ollama Connection
app.get("/api/ai/health", async (req, res) => {
  try {
    const response = await fetch("http://localhost:11434/api/tags");

    if (!response.ok) {
      throw new Error("Ollama is not responding.");
    }

    const data = await response.json();

    const modelAvailable = data.models?.some(
      (model) =>
        model.name === AI_MODEL ||
        model.name.startsWith(`${AI_MODEL}:`)
    );

    res.json({
      connected: true,
      provider: "Ollama",
      model: AI_MODEL,
      modelAvailable: Boolean(modelAvailable),
    });
  } catch (error) {
    console.error("Ollama health check failed:", error);

    res.status(503).json({
      connected: false,
      modelAvailable: false,
      error: "Could not connect to Ollama. Make sure it is running.",
    });
  }
});

// API: Context-Aware El Nexo AI
app.post("/api/ai/explain", async (req, res) => {
  try {
    const {
      prompt,
      context = "",
      fileName = "Current project",
    } = req.body || {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid question.",
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Question is too long.",
      });
    }

    if (typeof context !== "string" || context.length > 20000) {
      return res.status(400).json({
        success: false,
        error: "Code context must be under 20,000 characters.",
      });
    }

    if (typeof fileName !== "string" || fileName.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Invalid file name.",
      });
    }

    console.log("\n========== EL NEXO AI ==========");
    console.log("File:", fileName);
    console.log("Question:", prompt.trim());
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
    console.log("Context supplied:", Boolean(context.trim()));
    console.log("Response length:", answer.length);

    res.json({
      success: true,
      answer,
      model: AI_MODEL,
      provider: "Ollama",
      contextProvided: Boolean(context.trim()),
      fileName,
    });

  } catch (error) {
    console.error("El Nexo AI error:", error);

    res.status(503).json({
      success: false,
      error: "AI service is unavailable. Check Ollama and the installed model.",
    });
  }
});

// Serve Project Files
app.use(express.static(ROOT_DIR));

// Start Server
app.listen(PORT, () => {
  console.log("------------------------------------");
  console.log("       EL NEXO DEVELOPER STUDIO");
  console.log("------------------------------------");
  console.log(`Server running: http://localhost:${PORT}/playground/`);
  console.log("Dynamic example discovery: enabled");
  console.log(`AI provider: Ollama (${AI_MODEL})`);
  console.log("AI response limit: 180 tokens");
  console.log("AI API: /api/ai/explain");
});
