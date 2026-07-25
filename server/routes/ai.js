const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {verifyToken} = require("../middleware/auth");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.API_KEY);

const categories = [
  "Billing & Invoicing",
  "API & Integration",
  "Onboarding & KYC",
  "Transaction Disputes",
  "Account & Compliance",
];


const priorityLevels = ["Low", "Medium", "High"];

router.post("/categorise", verifyToken, async(req,res)=>{
    const {title, description} = req.body;

    if(!title || title.trim().length < 5){
        return res.status(400).json({error: "Title too short to classify"});
    }

    try{
        const model = genAI.getGenerativeModel({model : "gemini-2.0-flash"});

        const prompt = `
                You are a support ticket classifier for a B2B SaaS payments platform.
        A merchant has raised a support ticket with the following details:

        Title: "${title}"
        Description: "${description || "No description provided"}"

        Classify this ticket and respond with ONLY a valid JSON object — no explanation, no markdown, no code fences. Just raw JSON.

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
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try{
        parsed = JSON.parse(cleaned);
    }catch(parseErr){
        console.error("Gemini returned non-JSON",text);
        return res.status(502).json({error : "AI returned unexpected format"});
    }
    
    if(!categories.includes(parsed.category)){
        parsed.category = null;
    }
    if(!priorityLevels.includes(parsed.priority)){
        parsed.priority = "Medium";
    }
    if(typeof parsed.confidence !== "number")
        parsed.confidence = 0.5;

    return res.json({
        category : parsed.category,
        priority : parsed.priority,
        confidence : Math.min(1,Math.max(0,parsed.confidence)),
    });
    }catch(err){
        console.error("Gemini failed",err);
        return res.status(500).json({error: "AI Service unavailable"});
    }
});
    
module.exports = router;