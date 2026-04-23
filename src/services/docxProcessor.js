import mammoth from 'mammoth';

/**
 * Extract embedded images from a .docx file.
 * Returns an array of image Blobs with their index.
 * @param {File} docxFile - The .docx file
 * @returns {Promise<{blob: Blob, index: number}[]>}
 */
const docxToImages = async (docxFile) => {
  const arrayBuffer = await docxFile.arrayBuffer();
  const images = [];

  await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        // Collect each embedded image
        return image.read('base64').then((base64) => {
          const mimeType = image.contentType || 'image/png';
          const byteString = atob(base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeType });
          images.push({ blob, index: images.length + 1 });

          // Return a placeholder src (we don't need the HTML output)
          return { src: '' };
        });
      }),
    }
  );

  return images;
};

export default docxToImages;
