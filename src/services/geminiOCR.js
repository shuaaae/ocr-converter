import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeDocumentData } from '../utils/documentData.js';

const KNOWN_FIELDS = {
  ID: ['fullName', 'lastName', 'firstName', 'middleName', 'dateOfBirth', 'nationality', 'address', 'documentNumber', 'expiryDate'],
  COR: ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'address', 'documentNumber', 'age', 'gender', 'maritalStatus', 'birRegistrationDate'],
};

export const EXTRACTION_PROMPT = `
You extract structured information from uploaded documents. Analyze every supplied page in order as one logical document.

Return exactly one JSON object with this shape:
{"documentType":"specific human-readable type","data":{}}

Rules for data:
- Include only fields and values visibly supported by the document. Never guess, calculate, or add facts from general knowledge.
- Use descriptive camelCase keys based on printed labels.
- Use nested objects for named sections and arrays of objects for tables or repeated rows.
- Preserve checkbox values as booleans when clearly marked.
- Preserve numbers as numbers only when they are quantities; keep IDs, phone numbers, ZIP codes, and codes as strings.
- Use null for blank, missing, crossed-out, ambiguous, or unreadable values.
- Use YYYY-MM-DD for a date only when its interpretation is unambiguous. Otherwise preserve the printed date string.
- Do not include confidence scores, page numbers, coordinates, OCR text, explanations, markdown, metadata, or source filenames inside data.
- If the pages contain multiple clearly separate documents, set data to {"documents":[{"documentType":"...","fields":{}}, ...]}.
- If there is no readable document, return {"documentType":"none","reason":"brief reason","data":{}}.

Known document schemas:
- Government ID, passport, driver's license, national ID, voter ID, or similar: use documentType "ID" and fields fullName, lastName, firstName, middleName, dateOfBirth, nationality, address, documentNumber, expiryDate.
- BIR Certificate of Registration: use documentType "COR" and fields firstName, middleName, lastName, dateOfBirth, address, documentNumber, age, gender, maritalStatus, birRegistrationDate.
- Personal Data Sheet / CS Form 212: use documentType "PDS" and preserve its sections as nested objects or arrays, including personalInformation, familyBackground, educationalBackground, civilServiceEligibility, workExperience, voluntaryWork, learningAndDevelopment, otherInformation, questions, references, and governmentIssuedId when present.

For Filipino names, respect explicit labels. When an unlabeled name is printed as LAST NAME, FIRST NAME MIDDLE NAME, parse that order carefully.
Return valid JSON only.
`;

export const parseDocumentResponse = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error('The AI returned an invalid JSON response. Please try again.');
    try { parsed = JSON.parse(objectMatch[0]); }
    catch { throw new Error('The AI returned an invalid JSON response. Please try again.'); }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI returned an invalid document result. Please try again.');
  }
  if (parsed.documentType === 'none') {
    throw new Error(`No readable document found. ${parsed.reason || 'Try a clearer image with the whole document visible.'}`);
  }

  const documentType = typeof parsed.documentType === 'string' && parsed.documentType.trim()
    ? parsed.documentType.trim()
    : 'Document';

  let rawData = parsed.data;
  if (Array.isArray(rawData)) rawData = rawData.length === 1 ? rawData[0] : { documents: rawData };
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    throw new Error('No document fields were extracted. Please try a clearer image.');
  }

  let data = sanitizeDocumentData(rawData);
  if (KNOWN_FIELDS[documentType]) {
    data = Object.fromEntries(KNOWN_FIELDS[documentType].map(field => [field, data[field] ?? null]));
  }
  if (Object.keys(data).length === 0 || Object.values(data).every(value => value === null)) {
    throw new Error('No document fields were extracted. Please try a clearer image.');
  }

  return { ...data, _data: data, _documentType: documentType };
};

const normalizePages = async ({ file, base64, mimeType, ocrText, pages }) => {
  if (Array.isArray(pages) && pages.length > 0) {
    return pages.map((page, index) => ({
      base64: page.base64,
      mimeType: page.mimeType || 'image/png',
      ocrText: page.ocrText || '',
      label: page.label || `Page ${index + 1}`,
    }));
  }
  if (file) {
    const image = await imageToAIData(file);
    return [{ ...image, ocrText: ocrText || '', label: 'Page 1' }];
  }
  if (base64) return [{ base64, mimeType: mimeType || 'image/png', ocrText: ocrText || '', label: 'Page 1' }];
  throw new Error('Please provide a document image or page data.');
};

export const buildDocumentParts = (pages) => {
  const parts = [EXTRACTION_PROMPT];
  pages.forEach((page, index) => {
    const hint = page.ocrText.trim().slice(0, 16000);
    parts.push(`\n--- ${page.label || `Page ${index + 1}`} of ${pages.length} ---${hint ? `\nLocal OCR hint:\n${hint}` : ''}`);
    parts.push({ inlineData: { data: page.base64, mimeType: page.mimeType } });
  });
  return parts;
};

const geminiOCR = async (input = {}) => {
  const pages = await normalizePages(input);
  if (pages.some(page => !page.base64)) throw new Error('A document page could not be prepared for extraction.');

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    });
    if (response.status === 404 && import.meta.env?.DEV) {
      const apiKey = (import.meta.env?.VITE_GEMINI_API_KEY || '').trim();
      if (!apiKey) throw new Error('Add VITE_GEMINI_API_KEY to .env.local, then restart the development server.');
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 },
      });
      const result = await model.generateContent(buildDocumentParts(pages));
      return [parseDocumentResponse(result.response.text())];
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The document service is temporarily unavailable. Please try again.');
    return [parseDocumentResponse(payload.text)];
  } catch (error) {
    console.error('Gemini document extraction error:', error);
    if (error.message?.includes('document') || error.message?.includes('JSON') || error.message?.includes('fields')) throw error;
    throw new Error(error.message || 'Could not read this document. Please check your connection and try again.');
  }
};

const readBlobAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
});

export const imageToAIData = async (blob) => {
  try {
    const bitmap = await createImageBitmap(blob);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const optimized = await new Promise((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('Image optimization failed.')),
      'image/jpeg',
      0.84,
    ));
    return { base64: await readBlobAsBase64(optimized), mimeType: 'image/jpeg' };
  } catch {
    return { base64: await readBlobAsBase64(blob), mimeType: blob.type || 'image/jpeg' };
  }
};

export const blobToBase64 = readBlobAsBase64;

export default geminiOCR;
