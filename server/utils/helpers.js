/**
 * Extracts JWT token string from HTTP Authorization header or query params.
 * 
 * @param {string} authHeader - The raw Authorization header (e.g., 'Bearer <token>')
 * @param {string} queryToken - A token passed via query parameter
 * @returns {string|null} The clean token string, or null if not found
 */
function extractTokenFromHeaderOrQuery(authHeader, queryToken) {
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1] || null;
    } else if (authHeader) {
        return authHeader;
    } else if (queryToken) {
        return queryToken;
    }
    return null;
}

/**
 * Fallback keyword-based ticket classification when the AI LLM is unavailable.
 * 
 * @param {string} title - Ticket title
 * @param {string} description - Ticket description
 * @returns {object} Classification result containing category, priority, confidence, and reason
 */
function getFallbackClassification(title, description) {
    let fallbackCategory = "API & Integration";
    let fallbackPriority = "Medium";
    const lowerText = `${title || ""} ${description || ""}`.toLowerCase();

    if (
        lowerText.includes("dispute") ||
        lowerText.includes("chargeback") ||
        lowerText.includes("fraud")
    ) {
        fallbackCategory = "Transaction Disputes";
    } else if (
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

/**
 * Normalizes, clamps, and converts a numeric confidence score (0 to 1) 
 * into percentage representations, localized levels, and styling colors.
 * 
 * @param {number} score - Raw confidence score decimal
 * @returns {object} Object containing confidence level, percentage string, and badge color
 */
function formatConfidence(score) {
    if (typeof score !== "number" || isNaN(score)) {
        return { level: "Low", formatted: "0%", color: "red" };
    }
    const clamped = Math.min(1, Math.max(0, score));
    const percentage = Math.round(clamped * 100) + "%";
    
    let level = "Low";
    let color = "red";
    
    if (clamped >= 0.8) {
        level = "High";
        color = "green";
    } else if (clamped >= 0.5) {
        level = "Medium";
        color = "yellow";
    }
    
    return { level, formatted: percentage, color };
}

module.exports = {
    extractTokenFromHeaderOrQuery,
    getFallbackClassification,
    formatConfidence
};
