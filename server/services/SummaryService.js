const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Force a full resync if this many new messages have accumulated since last cursor
const FULL_RESYNC_THRESHOLD = 20;

// Debounce window — skip regeneration if summary was updated within this many ms
const DEBOUNCE_MS = 60 * 1000; // 60 seconds

/**
 * generateAndCacheSummary
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a 2-sentence AI summary for the given ticket thread.
 *
 * Modes:
 *  full        — no prior summary exists, summarize everything from scratch.
 *  incremental — prior summary + cursor exist, only feed new messages to LLM.
 *  full_resync — prior summary exists but >= FULL_RESYNC_THRESHOLD new messages
 *                have accumulated since last cursor (prevents summary drift).
 *
 * Guardrails:
 *  debounce    — return cached summary immediately if updated < 60s ago.
 *  no-op       — return cached summary if no new messages since last cursor.
 *  fallback    — return cached summary (or null) if Groq call fails.
 *
 * @param {number|string} ticket_id
 * @param {object}        pool  - node-postgres Pool instance
 * @returns {Promise<string|null>} The 2-sentence summary, or null if no content
 */
async function generateAndCacheSummary(ticket_id, pool) {
    // ── 1. Fetch ticket metadata ──────────────────────────────────────────────
    const ticketResult = await pool.query(
        `SELECT title, description, ai_summary, ai_summary_updated_at,
                last_summarized_message_id
         FROM tickets
         WHERE ticket_id = $1`,
        [ticket_id]
    );

    if (ticketResult.rows.length === 0) {
        throw new Error(`Ticket ${ticket_id} not found`);
    }

    const ticket = ticketResult.rows[0];

    // ── 2. Debounce guard ─────────────────────────────────────────────────────
    if (ticket.ai_summary && ticket.ai_summary_updated_at) {
        const ageMs = Date.now() - new Date(ticket.ai_summary_updated_at).getTime();
        if (ageMs < DEBOUNCE_MS) {
            console.log(
                `[SummaryService] Debounced ticket ${ticket_id} ` +
                `(summary is ${Math.round(ageMs / 1000)}s old, skipping Groq call)`
            );
            return ticket.ai_summary;
        }
    }

    // ── 3. Fetch all non-deleted messages ─────────────────────────────────────
    const msgsResult = await pool.query(
        `SELECT message_id, sender_type, message
         FROM ticket_messages
         WHERE ticket_id = $1 AND is_deleted = false
         ORDER BY created_at ASC, message_id ASC`,
        [ticket_id]
    );
    const allMessages = msgsResult.rows;

    // No content at all — nothing to summarize
    if (allMessages.length === 0 && !ticket.description) {
        return null;
    }

    // ── 4. Determine generation mode ──────────────────────────────────────────
    const lastCursorId = ticket.last_summarized_message_id !== null
        ? parseInt(ticket.last_summarized_message_id, 10)
        : null;

    const hasPriorSummary = !!ticket.ai_summary && lastCursorId !== null;

    let newMessages = [];
    let mode = "full";

    if (hasPriorSummary) {
        newMessages = allMessages.filter(m => m.message_id > lastCursorId);

        if (newMessages.length === 0) {
            // Nothing new since last cursor — no Groq call needed
            console.log(`[SummaryService] Ticket ${ticket_id}: no new messages since cursor. Returning cached.`);
            return ticket.ai_summary;
        }

        mode = newMessages.length >= FULL_RESYNC_THRESHOLD ? "full_resync" : "incremental";
    }

    console.log(
        `[SummaryService] Ticket ${ticket_id} — mode: ${mode}, ` +
        `new: ${newMessages.length}, total: ${allMessages.length}`
    );

    // ── 5. Build prompt ───────────────────────────────────────────────────────
    const formatMessages = (msgs) =>
        msgs.map(m => `[${m.sender_type}]: ${m.message}`).join("\n");

    let prompt;

    if (mode === "full" || mode === "full_resync") {
        const threadText = allMessages.length > 0
            ? formatMessages(allMessages)
            : "(no messages yet)";

        prompt =
            `You are a concise support ticket analyst.\n\n` +
            `Ticket Title: "${ticket.title}"\n` +
            `Initial Description: "${ticket.description || "No description provided"}"\n\n` +
            `Full conversation thread:\n${threadText}\n\n` +
            `Write exactly 2 sentences:\n` +
            `Sentence 1 — the core issue the customer is facing.\n` +
            `Sentence 2 — the current status or latest development.\n` +
            `Do NOT use bullet points, headers, or markdown. Output only the 2 sentences.`;
    } else {
        // incremental — feed only the delta
        const deltaText = formatMessages(newMessages);

        prompt =
            `You are a concise support ticket analyst.\n\n` +
            `Current 2-sentence summary:\n"${ticket.ai_summary}"\n\n` +
            `New messages added since that summary:\n${deltaText}\n\n` +
            `Update the summary to exactly 2 sentences reflecting the current state:\n` +
            `Sentence 1 — the core issue the customer is facing.\n` +
            `Sentence 2 — the current status or latest development.\n` +
            `Do NOT use bullet points, headers, or markdown. Output only the 2 sentences.`;
    }

    // ── 6. Call Groq ──────────────────────────────────────────────────────────
    let summary;
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 150,
        });
        summary = completion.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.error("[SummaryService] Groq call failed:", err.message);
        // Graceful fallback — return existing cached summary rather than crashing
        return ticket.ai_summary || null;
    }

    if (!summary) return ticket.ai_summary || null;

    // ── 7. Persist summary + cursor ───────────────────────────────────────────
    const latestMsgId = allMessages.length > 0
        ? allMessages[allMessages.length - 1].message_id
        : lastCursorId;

    await pool.query(
        `UPDATE tickets
         SET ai_summary                 = $1,
             ai_summary_updated_at      = NOW(),
             last_summarized_message_id = $2
         WHERE ticket_id = $3`,
        [summary, latestMsgId, ticket_id]
    );

    console.log(
        `[SummaryService] Ticket ${ticket_id} summary saved. ` +
        `Cursor → msg #${latestMsgId}`
    );

    return summary;
}

module.exports = { generateAndCacheSummary };
