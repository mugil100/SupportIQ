const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const categories = [
  "Billing & Invoicing",
  "API & Integration",
  "Onboarding & KYC",
  "Transaction Disputes",
  "Account & Compliance",
];

const priorityLevels = ["Low", "Medium", "High"];

async function classifyTicket(title, description) {
  if (!title || title.trim().length < 5) {
    throw new Error("Title too short to classify");
  }

  try {
    const prompt = `You are a support ticket classifier for a B2B SaaS payments platform.
A merchant has raised a support ticket with the following details:

Title: "${title}"
Description: "${description || "No description provided"}"

Classify this ticket and respond with ONLY a valid JSON object.

The JSON must have exactly these fields:
{
  "category": one of ${JSON.stringify(categories)},
  "priority": one of ${JSON.stringify(priorityLevels)},
  "confidence": a number between 0 and 1 representing how confident you are,
  "reason": a single sentence explaining why you chose this category
}

Priority rules:
- High: account suspended, payments failing, data breach, complete service outage
- Medium: partial failures, settlement delays, integration errors, KYC stuck
- Low: general questions, report queries, minor UI issues, feature requests`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const text = chatCompletion.choices[0]?.message?.content?.trim() || "";

    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Groq returned non-JSON:", text);
      throw new Error("AI returned unexpected format");
    }

    if (!categories.includes(parsed.category)) {
      parsed.category = null;
    }
    if (!priorityLevels.includes(parsed.priority)) {
      parsed.priority = "Medium";
    }
    if (typeof parsed.confidence !== "number") {
      parsed.confidence = 0.5;
    }

    return {
      category: parsed.category,
      priority: parsed.priority,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      reason: parsed.reason || "Auto-classified by Groq AI",
    };
  } catch (err) {
    console.error(
      "Groq API call failed (Falling back to rule-based classification):",
      err.message || err
    );

    // Fallback rule-based classifier if Groq API is unavailable
    let fallbackCategory = "API & Integration";
    let fallbackPriority = "Medium";
    const lowerText = `${title} ${description || ""}`.toLowerCase();

    if (
      lowerText.includes("invoice") ||
      lowerText.includes("billing") ||
      lowerText.includes("charge") ||
      lowerText.includes("refund")
    ) {
      fallbackCategory = "Billing & Invoicing";
    } else if (
      lowerText.includes("kyc") ||
      lowerText.includes("onboard") ||
      lowerText.includes("document")
    ) {
      fallbackCategory = "Onboarding & KYC";
    } else if (
      lowerText.includes("dispute") ||
      lowerText.includes("chargeback") ||
      lowerText.includes("fraud")
    ) {
      fallbackCategory = "Transaction Disputes";
    } else if (
      lowerText.includes("suspend") ||
      lowerText.includes("compliance") ||
      lowerText.includes("policy") ||
      lowerText.includes("outage")
    ) {
      fallbackCategory = "Account & Compliance";
      fallbackPriority = "High";
    }

    return {
      category: fallbackCategory,
      priority: fallbackPriority,
      confidence: 0.8,
      reason: "Rule-based fallback classification (Groq API unavailable)",
    };
  }
}

router.post("/categorise", verifyToken, async (req, res) => {
  const { title, description } = req.body;

  if (!title || title.trim().length < 5) {
    return res.status(400).json({ error: "Title too short to classify" });
  }

  try {
    const result = await classifyTicket(title, description);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to classify ticket" });
  }
});

// Suggested reply backend: POST /agent/ai-suggest and POST /agent/ai-suggest/:id
// Takes ticket ID and optional variant context, streams reply variants via SSE
router.post(["/ai-suggest", "/ai-suggest/:id"], verifyToken, async (req, res) => {
  if (req.role !== "agent" && req.role !== "manager" && req.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Support agents only." });
  }

  const ticketId = req.params.id || req.body?.ticket_id || req.body?.id || req.query?.ticket_id;
  const requestedVariant = (req.body?.variant || req.query?.variant || "").toLowerCase();
  const limit = parseInt(req.body?.limit || req.query?.limit || 10, 10);

  if (!ticketId) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  try {
    // 1. Fetch ticket details
    const ticketResult = await pool.query(
      `SELECT ticket_id, title, category, priority, description, status 
       FROM tickets 
       WHERE ticket_id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // 2. Fetch last N messages in chronological order
    const messagesResult = await pool.query(
      `SELECT sender_type, message, created_at
       FROM ticket_messages
       WHERE ticket_id = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL)
       ORDER BY created_at DESC
       LIMIT $2`,
      [ticketId, limit]
    );

    const messages = messagesResult.rows.reverse();

    let conversationHistory = messages
      .map((m) => `[${m.sender_type}]: ${m.message}`)
      .join("\n");

    if (!conversationHistory) {
      conversationHistory = "No previous messages in chat.";
    }

    // 3. Set headers for SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // 4. Construct prompt for Groq LLM based on variant request
    let systemInstruction = "";
    if (requestedVariant) {
      systemInstruction = `You are an expert customer support AI assistant for SupportIQ, a B2B SaaS payments platform.
Your task is to write a single, high-quality response to the customer ticket in a strictly **${requestedVariant.toUpperCase()}** tone.
- Professional: Formal, structured, precise, polite.
- Empathetic: Warm, understanding, reassuring, acknowledging frustration.
- Brief: Concise, direct, 1-2 sentences or quick bullet points.

Provide ONLY the reply text itself. Do not include markdown headers, quotes, pleasantries outside the message, or conversational meta-text.`;
    } else {
      systemInstruction = `You are an expert customer support AI assistant for SupportIQ, a B2B SaaS payments platform.
Your job is to generate 3 high-quality reply options for a support agent responding to a customer ticket.

You MUST provide responses in 3 distinct tones:
1. **Professional**: Formal, structured, precise, and polite.
2. **Empathetic**: Warm, understanding, reassuring, acknowledging customer concern.
3. **Brief**: Concise, direct, 1-2 key sentences or quick actionable steps.

Format your response strictly using markdown headers like this:

### Professional
[Professional reply here]

### Empathetic
[Empathetic reply here]

### Brief
[Brief reply here]

Do not include any conversational meta-text or commentary outside of these 3 sections.`;
    }

    const promptMessages = [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: `Ticket #${ticket.ticket_id} Context:
- Title: ${ticket.title}
- Category: ${ticket.category || "General"}
- Priority: ${ticket.priority || "Medium"}
- Initial Description: ${ticket.description}

Recent Messages (Chronological):
${conversationHistory}

Generate the response now.`,
      },
    ];

    // 5. Stream responses from Groq
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: promptMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        // Send both text and content for full frontend compatibility
        res.write(`data: ${JSON.stringify({ content, text: content })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("AI Suggest Error:", err);

    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Failed to generate AI suggestions" });
    }

    res.write(`data: ${JSON.stringify({ error: err.message || "Streaming failed mid-request" })}\n\n`);
    res.end();
  }
});

module.exports = router;
module.exports.classifyTicket = classifyTicket;
