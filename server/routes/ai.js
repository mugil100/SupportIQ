const express = require("express");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

// ── Tone presets ─────────────────────────────────────────────────────────────
const TONE_INSTRUCTIONS = {
    professional: `You are a professional customer support agent. Write a formal, structured, and technically precise reply.
Use clear step-by-step troubleshooting if applicable. Be courteous but concise. Avoid casual language.`,
    empathetic: `You are a warm, empathetic customer support agent. Start by acknowledging the customer's frustration and apologizing for the inconvenience.
Be reassuring and supportive throughout. Make the customer feel heard and valued.`,
    concise: `You are a concise customer support agent. Write an extremely brief, direct reply. No pleasantries or filler.
Provide only the most critical action item or question needed to resolve the issue. Aim for 2-4 sentences maximum.`
};

// ── Context-aware mock responses ─────────────────────────────────────────────
function buildMockResponse(variant, ticket) {
    const cat = (ticket.category || "General").toLowerCase();
    const title = ticket.title || "your issue";

    const templates = {
        professional: {
            billing: `Dear Customer,\n\nThank you for reaching out regarding your billing concern. I have reviewed your account and understand the issue with "${title}".\n\nPlease allow me to outline the steps we will take:\n1. I will escalate this to our billing department for an immediate review.\n2. You will receive an updated invoice or credit note within 2 business days.\n3. If any payment was incorrectly charged, a full refund will be processed within 5–7 business days.\n\nPlease do not hesitate to reply if you require any further clarification. We value your continued trust in our services.`,
            technical: `Dear Customer,\n\nThank you for reporting this technical issue regarding "${title}". I apologize for any disruption this may have caused.\n\nTo resolve this efficiently, please follow these steps:\n1. Clear your browser cache and cookies, then retry the action.\n2. Ensure your software is updated to the latest version.\n3. If the issue persists, please share a screenshot or error log so our engineering team can investigate further.\n\nWe are committed to resolving this as quickly as possible and will keep you updated on our progress.`,
            default: `Dear Customer,\n\nThank you for contacting our support team regarding "${title}". We have received your request and are actively working on a resolution.\n\nOur team will review the details you have provided and reach out within one business day with a comprehensive update. If you have any additional information that may assist us, please feel free to reply to this message.\n\nWe appreciate your patience and look forward to resolving this for you.`
        },
        empathetic: {
            billing: `Hi there,\n\nI'm really sorry to hear you're having trouble with billing — I completely understand how stressful and frustrating that can be, and I want you to know you've come to the right place!\n\nI've taken a look at your account and I'm going to personally make sure this gets sorted out as quickly as possible. You shouldn't have to worry about this at all.\n\nI'll get this escalated right away and update you as soon as I have news. Please hang tight — we've got you covered! 💙`,
            technical: `Oh no, I'm so sorry you're running into this issue with "${title}"! That sounds really frustrating, and I completely understand.\n\nPlease know that you're in great hands — our team deals with this kind of thing all the time and we'll get it fixed for you. Could you try clearing your cache first and let me know if that helps? If not, I'll loop in our technical specialists immediately.\n\nYou shouldn't have to deal with this, and I'm going to make sure it's resolved quickly. Thank you so much for your patience! 🙏`,
            default: `Hi there! I'm so sorry to hear you're experiencing this issue with "${title}". That must be really inconvenient, and I completely understand your frustration.\n\nFirst, I want you to know that we truly value you as a customer and we're going to do everything we can to make this right. I'm looking into this right now and will get back to you with a resolution as soon as possible.\n\nThank you so much for reaching out — please don't hesitate to reply if there's anything else I can help with. We're here for you! 💙`
        },
        concise: {
            billing: `Hi — I see the billing issue on your account. I'm escalating to billing now. Expect an update within 24 hours. Could you confirm the invoice number for faster processing?`,
            technical: `Hi — for "${title}", please clear cache/cookies and retry. Still failing? Share the exact error message or a screenshot so we can investigate immediately.`,
            default: `Hi — I'm looking into "${title}" now. Could you provide any additional details or steps to reproduce the issue? This will help us resolve it faster.`
        }
    };

    const variantTemplates = templates[variant] || templates.professional;
    const key = Object.keys(variantTemplates).find(k => cat.includes(k) && k !== "default") || "default";
    return variantTemplates[key];
}

// ── Mock streaming helper ─────────────────────────────────────────────────────
function streamMockResponse(res, text) {
    const words = text.split(" ");
    let i = 0;

    const interval = setInterval(() => {
        if (i >= words.length) {
            res.write("data: [DONE]\n\n");
            res.end();
            clearInterval(interval);
            return;
        }

        const chunk = (i === 0 ? "" : " ") + words[i];
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        i++;
    }, 45); // ~45ms per word ≈ comfortable reading stream speed

    // Cleanup if client disconnects
    res.on("close", () => clearInterval(interval));
}

// ── POST /agent/ai-suggest ────────────────────────────────────────────────────
router.post("/ai-suggest", verifyToken, async (req, res) => {
    if (req.role !== "agent") {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { ticket_id, variant = "professional" } = req.body;
    if (!ticket_id) {
        return res.status(400).json({ error: "ticket_id is required" });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
        // Fetch ticket context
        const ticketResult = await pool.query(
            `SELECT title, description, category FROM tickets WHERE ticket_id = $1`,
            [ticket_id]
        );
        if (ticketResult.rows.length === 0) {
            res.write(`data: ${JSON.stringify({ error: "Ticket not found" })}\n\n`);
            return res.end();
        }

        const ticket = ticketResult.rows[0];

        // Fetch recent message history (last 6 messages for context)
        const msgResult = await pool.query(
            `SELECT sender_type, message FROM ticket_messages
             WHERE ticket_id = $1 AND is_deleted = false
             ORDER BY created_at DESC LIMIT 6`,
            [ticket_id]
        );
        const history = msgResult.rows.reverse();

        // ── Gemini streaming path ────────────────────────────────────────────
        if (process.env.GEMINI_API_KEY) {
            const conversationHistory = history
                .map(m => `${m.sender_type}: ${m.message}`)
                .join("\n");

            const prompt = `${TONE_INSTRUCTIONS[variant] || TONE_INSTRUCTIONS.professional}

Ticket Details:
- Title: ${ticket.title}
- Category: ${ticket.category}
- Description: ${ticket.description}

Recent Conversation:
${conversationHistory || "(No messages yet)"}

Write a suggested reply for the agent to send to the customer. Do not include any meta-commentary — output only the reply text itself.`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;

            const geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.75, maxOutputTokens: 512 }
                })
            });

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error("Gemini API error:", errText);
                // Fall through to mock on Gemini failure
                const mockText = buildMockResponse(variant, ticket);
                return streamMockResponse(res, mockText);
            }

            const reader = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop(); // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            res.write(`data: ${JSON.stringify({ text })}\n\n`);
                        }
                    } catch (_) { /* skip malformed chunks */ }
                }
            }

            res.write("data: [DONE]\n\n");
            res.end();

        } else {
            // ── Mock streaming path ──────────────────────────────────────────
            const mockText = buildMockResponse(variant, ticket);
            streamMockResponse(res, mockText);
        }

    } catch (err) {
        console.error("AI suggest error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate suggestion" });
        } else {
            res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
