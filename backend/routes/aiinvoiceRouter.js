import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const aiInvoiceRouter = express.Router();
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash'];

const ai = new GoogleGenAI({ apiKey: API_KEY });

function buildInvoicePrompt(promptText) {
    const today = new Date().toISOString().slice(0, 10);
    return `You are an invoice generation assistant. Extract invoice details from the user input and return ONLY a valid JSON object with no markdown, no code fences, no explanation.

Return this exact JSON structure (fill in what you can from the input, leave others as empty string or 0):
{
  "invoiceNumber": "INV-${Math.floor(Math.random() * 9000) + 1000}",
  "issueDate": "${today}",
  "dueDate": "",
  "fromBusinessName": "",
  "fromEmail": "",
  "fromAddress": "",
  "fromPhone": "",
  "client": { "name": "", "email": "", "address": "", "phone": "" },
  "items": [{ "id": "1", "description": "", "qty": 1, "unitPrice": 0 }],
  "taxPercent": 18,
  "currency": "INR",
  "notes": ""
}

User input: ${promptText}

Respond with valid JSON only.`;
}

aiInvoiceRouter.post('/generate', async (req, res) => {
    if (!API_KEY) {
        return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });
    }

    const { prompt } = req.body;
    if (!prompt?.trim()) {
        return res.status(400).json({ success: false, message: 'Prompt text is required' });
    }

    const fullPrompt = buildInvoicePrompt(prompt.trim());
    let lastErr = null;

    for (const modelName of MODEL_CANDIDATES) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: fullPrompt,
            });

            // response.text is a getter in @google/genai SDK
            const raw = typeof response.text === 'function'
                ? response.text()
                : response.text;

            if (!raw?.trim()) throw new Error('Empty response from model');

            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace <= firstBrace) {
                throw new Error('No JSON object found in response');
            }

            const data = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
            return res.status(200).json({ success: true, model: modelName, data });

        } catch (err) {
            console.warn(`Model ${modelName} failed:`, err?.message);
            lastErr = err;
        }
    }

    return res.status(502).json({
        success: false,
        message: 'All AI models failed',
        detail: lastErr?.message || 'Unknown error'
    });
});

export default aiInvoiceRouter;