import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const PLACEHOLDER_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

const ID_REQUIRED_FIELDS = [
  'fullName',
  'lastName',
  'firstName',
  'middleName',
  'dateOfBirth',
  'nationality',
  'address',
  'documentNumber',
  'expiryDate',
];

const COR_REQUIRED_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'dateOfBirth',
  'address',
  'documentNumber',
  'age',
  'gender',
  'maritalStatus',
  'birRegistrationDate',
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
First, determine the type of document in this image. The document can be either:
1. An ID document (government-issued ID cards, passports, driver's licenses, national IDs, voter IDs, or similar official identification documents)
2. A COR (Certificate of Registration) document from BIR (Bureau of Internal Revenue)

If the image does NOT contain either type of document, return exactly:
{"documentType": "none", "reason": "Brief explanation of what the image shows instead"}

If the image contains ID DOCUMENTS:
- Analyze carefully. It may contain ONE or MULTIPLE ID documents.
${ocrHint}
- For EACH ID document, extract these fields:
  - fullName: Full name of the person exactly as printed on the ID
  - lastName: The person's surname / family name
  - firstName: The person's given name / first name
  - middleName: The person's middle name (if present)
  - dateOfBirth: Date of birth
  - nationality: Nationality or citizenship
  - address: Complete address
  - documentNumber: ID number, passport number, or document number
  - expiryDate: Expiration date of the document

Return: {"documentType": "ID", "data": [{"fullName":"...","lastName":"...","firstName":"...","middleName":"...","dateOfBirth":"...","nationality":"...","address":"...","documentNumber":"...","expiryDate":"..."}]}

If the image contains COR DOCUMENTS:
- Analyze carefully. It may contain ONE or MULTIPLE COR documents.
${ocrHint}
- For EACH COR document, extract these fields:
  - firstName: First name / given name
  - middleName: Middle name (if present)
  - lastName: Last name / surname
  - dateOfBirth: Date of birth (may be labeled as "Birthday", "Date of Birth", "Bday")
  - address: Complete address
  - documentNumber: BIR Registration Number / TIN (Tax Identification Number)
  - age: Age of the person
  - gender: Gender (Male/Female)
  - maritalStatus: Marital status (Single, Married, Widowed, etc.)
  - birRegistrationDate: BIR Registration Date (when the COR was registered)

Return: {"documentType": "COR", "data": [{"firstName":"...","middleName":"...","lastName":"...","dateOfBirth":"...","address":"...","documentNumber":"...","age":"...","gender":"...","maritalStatus":"...","birRegistrationDate":"..."}]}

IMPORTANT for name parsing:
- For Filipino documents: Names are typically formatted as "LAST NAME, FIRST NAME MIDDLE NAME" — parse accordingly.
- For Western documents: Names are typically "FIRST NAME MIDDLE NAME LAST NAME".
- If the document explicitly labels name parts (e.g. "Surname:", "Given Name:"), use those labels.

If a field is not found, use "Not found" as the value.

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

    // Check if image was rejected as non-document
    if (parsed && parsed.documentType === 'none') {
      throw new Error(`This doesn't appear to be a valid document. ${parsed.reason || 'Please upload a valid government-issued ID, passport, driver\'s license, or BIR Certificate of Registration.'}`);
    }

    // Handle new format with documentType wrapper
    let items;
    let documentType = 'ID'; // Default to ID for backward compatibility

    if (parsed && parsed.documentType && Array.isArray(parsed.data)) {
      documentType = parsed.documentType;
      items = parsed.data;
    } else if (parsed && parsed.isIdDocument === true && Array.isArray(parsed.data)) {
      items = parsed.data;
    } else if (parsed && parsed.isIdDocument === false) {
      throw new Error(`This doesn't appear to be a valid document.`);
    } else if (Array.isArray(parsed)) {
      items = parsed;
    } else {
      items = [parsed];
    }

    // Determine which fields to validate based on document type
    const requiredFields = documentType === 'COR' ? COR_REQUIRED_FIELDS : ID_REQUIRED_FIELDS;

    // Extra validation: reject if all fields are "Not found"
    const normalized = items.map((item) => normalizeExtractedData(item, requiredFields));
    const allEmpty = normalized.every((item) =>
      requiredFields.every((f) => item[f] === 'Not found')
    );
    if (allEmpty) {
      throw new Error('No information could be extracted. Please ensure the image contains a clear, readable document.');
    }

    // Add documentType to each item
    return normalized.map(item => ({ ...item, _documentType: documentType }));
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

const normalizeExtractedData = (data, requiredFields = ID_REQUIRED_FIELDS) => {
  return requiredFields.reduce((normalized, field) => {
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
