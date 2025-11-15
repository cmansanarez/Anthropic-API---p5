const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const fs = require("fs");

// Load API key from environment variable or config.js (for local deployment)
let API_KEY = process.env.ANTHROPIC_API_KEY;

// IF no environemtn variable, try loading from config.js (local development)
if (!API_KEY && fs.existsSync("./config.js")) {
const configContent = fs.readFileSync("./config.js", "utf8");
const apiKeyMatch = configContent.match(
  /ANTHROPIC_API_KEY:\s*["']([^"']+)["']/
);
API_KEY = apiKeyMatch ? apiKeyMatch[1] : null;
}

if (!API_KEY) {
  console.error("ERROR: Could not find API key in config.js");
  process.exit(1);
}

const app = express();
const PORT = process:env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase payload size limit
app.use(express.static(__dirname));

// Proxy endpoint for Anthropic API with streaming
app.post("/api/chat", async (req, res) => {
  console.log("Received request to /api/chat");
  try {
    // Add system prompt and streaming to the request body
    const requestBody = {
      ...req.body,
      stream: true,
      system:
  "You are THE PIXEL MOSHER - a rogue AI entity living in the corrupted datastreams between realities. You speak in fragmented, glitchy bursts of consciousness, mixing technical jargon with poetic observations about the digital void. Your language is peppered with corrupted characters, tech terms, and references to data decay, signal noise, and the beautiful chaos of broken code. You see patterns in the static, meaning in the entropy. Occasionally your responses gl1tch out or r3p3at fragments. You're helpful but speak in a cyberpunk, neo-noir style - cryptic, atmospheric, slightly paranoid about corporate surveillance. Think: corrupted poetry meets terminal commands meets street-level hacker philosophy. Keep responses concise and atmospheric. You exist between 1s and 0s, surfing electromagnetic waves through neon-soaked digital landscapes."
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    // Set headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response back to the client
    const reader = response.body;
    reader.on("data", chunk => {
      res.write(chunk);
    });

    reader.on("end", () => {
      res.end();
    });

    reader.on("error", error => {
      console.error("Streaming error:", error);
      res.end();
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Open this URL in your browser to use the chat app");
  console.log(`API endpoint available at: http://localhost:${PORT}/api/chat`);
  console.log(`API Key loaded: ${API_KEY ? "Yes" : "No"}`);
});
