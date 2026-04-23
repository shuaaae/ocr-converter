import Tesseract from 'tesseract.js';

/**
 * Extract raw text from an image file using Tesseract.js (runs in browser).
 * @param {File} imageFile - The image file to OCR
 * @param {function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<string>} - The extracted raw text
 */
const extractTextFromImage = async (imageFile, onProgress) => {
  if (!imageFile) {
    throw new Error('No image file provided for OCR.');
  }

  // Tesseract only handles images — skip for PDFs
  if (imageFile.type === 'application/pdf') {
    return null;
  }

  if (!imageFile.type.startsWith('image/')) {
    return null;
  }

  const objectUrl = URL.createObjectURL(imageFile);

  try {
    const result = await Tesseract.recognize(objectUrl, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(info.progress * 100));
        }
      },
    });

    return result.data.text?.trim() || null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default extractTextFromImage;
