const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
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

module.exports = router;
module.exports.classifyTicket = classifyTicket;
