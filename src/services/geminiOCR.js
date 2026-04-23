import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const PLACEHOLDER_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

const REQUIRED_FIELDS = [
  'fullName',
  'dateOfBirth',
  'nationality',
  'address',
  'documentNumber',
  'expiryDate',
];

/**
 * Extract ALL IDs from an image (may contain multiple IDs).
 * Returns an array of normalized ID objects.
 *
 * @param {Object} options
 * @param {File}   [options.file]       - Image file (will be converted to base64)
 * @param {string} [options.base64]     - Pre-encoded base64 image data
 * @param {string} [options.mimeType]   - MIME type when using base64
 * @param {string} [options.ocrText]    - Optional pre-extracted OCR text hint
 * @returns {Promise<Object[]>}         - Array of extracted ID objects
 */
const geminiOCR = async ({ file, base64, mimeType, ocrText } = {}) => {
  if (!file && !base64) {
    throw new Error('Please provide an image file or base64 data.');
  }

  if (!API_KEY || API_KEY === PLACEHOLDER_API_KEY) {
    throw new Error('Gemini API key is still missing. Replace YOUR_GEMINI_API_KEY_HERE in .env.local with your real API key, then restart the dev server.');
  }

  if (!API_KEY.startsWith('AIza')) {
    throw new Error('Gemini API key format looks invalid. Check the key in .env.local, then restart the dev server.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  // Resolve image data
  let imgBase64 = base64;
  let imgMime = mimeType;
  if (file && !base64) {
    imgBase64 = await fileToBase64(file);
    imgMime = file.type;
  }

  // Build prompt — handles multiple IDs per image
  const ocrHint = ocrText
    ? `\n\nHere is raw OCR text already extracted from the document (use it as a reference alongside the image):\n---\n${ocrText}\n---\n`
    : '';

  const prompt = `
Analyze this image carefully. It may contain ONE or MULTIPLE ID documents (e.g. several IDs pasted on the same page).
${ocrHint}
For EACH ID document you find in the image, extract these fields:
- fullName: Full name of the person
- dateOfBirth: Date of birth
- nationality: Nationality or citizenship
- address: Complete address
- documentNumber: ID number, passport number, or document number
- expiryDate: Expiration date of the document

If a field is not found, use "Not found" as the value.

Return a JSON ARRAY of objects. Even if there is only one ID, wrap it in an array.
Example: [{"fullName":"...","dateOfBirth":"...","nationality":"...","address":"...","documentNumber":"...","expiryDate":"..."}]

Return ONLY valid JSON without markdown formatting. Do not include extra text.
`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imgBase64,
          mimeType: imgMime,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    const parsed = parseGeminiJson(text);

    // Ensure we always have an array
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map(normalizeExtractedData);
  } catch (error) {
    console.error('Gemini OCR Error:', error);
    throw new Error(error.message || 'Failed to extract data from image. Please check your API key and try again.');
  }
};

const parseGeminiJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    // Try to find an array first
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    // Fall back to single object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
  }

  throw new Error('Could not parse response from Gemini.');
};

const normalizeExtractedData = (data) => {
  return REQUIRED_FIELDS.reduce((normalized, field) => {
    normalized[field] = typeof data?.[field] === 'string' && data[field].trim()
      ? data[field].trim()
      : 'Not found';
    return normalized;
  }, {});
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Convert a Blob to base64 string (without the data URL prefix).
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default geminiOCR;
