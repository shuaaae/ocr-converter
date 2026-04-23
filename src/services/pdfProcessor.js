import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Convert a PDF file into an array of page image Blobs (PNG).
 * @param {File} pdfFile - The PDF file
 * @param {function} onProgress - Optional callback (pageNum, totalPages)
 * @returns {Promise<{blob: Blob, pageNum: number}[]>} - Array of page image blobs
 */
const pdfToPageImages = async (pdfFile, onProgress) => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    if (onProgress) onProgress(i, totalPages);

    const page = await pdf.getPage(i);
    // Render at 2x scale for better OCR quality
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );

    pages.push({ blob, pageNum: i });

    // Clean up
    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
};

export default pdfToPageImages;
