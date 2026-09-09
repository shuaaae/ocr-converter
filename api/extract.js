/* global process */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildDocumentParts } from '../src/services/geminiOCR.js';

export const config = { maxDuration: 60 };

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return response.status(503).json({ error: 'Document scanning is not configured on the server.' });

  const pages = request.body?.pages;
  if (!Array.isArray(pages) || pages.length === 0 || pages.some(page => !page?.base64 || !page?.mimeType)) {
    return response.status(400).json({ error: 'No readable document pages were supplied.' });
  }

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 },
    });
    const result = await model.generateContent(buildDocumentParts(pages));
    return response.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Document extraction provider error:', error);
    const blocked = error?.message?.includes('API_KEY_HTTP_REFERRER_BLOCKED');
    return response.status(blocked ? 503 : 502).json({
      error: blocked
        ? 'The server AI key has an incompatible website restriction. Configure GEMINI_API_KEY as a server key restricted to the Generative Language API.'
        : 'The AI could not read this document. Please try a clearer photo or try again shortly.',
    });
  }
}
