import { useState, useRef, useCallback } from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/sections/HeroSection';
import TrustedBySection from '../components/sections/TrustedBySection';
import FeaturesSection from '../components/sections/FeaturesSection';
import AboutSection from '../components/sections/AboutSection';
import Footer from '../components/sections/Footer';
import geminiOCR, { blobToBase64 } from '../services/geminiOCR';
import extractTextFromImage from '../services/ocrEngine';
import pdfToPageImages from '../services/pdfProcessor';
import docxToImages from '../services/docxProcessor';


const MAX_FILES = 10;

// Simple file fingerprint for caching
const getFileKey = (file) => `${file.name}_${file.size}_${file.lastModified}`;

const HomePage = () => {
  const [files, setFiles] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef(null);
  const cacheRef = useRef(new Map());

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed. You selected ${selected.length}.`);
      e.target.value = '';
      return;
    }
    if (selected.length > 0) {
      setFiles(selected);
      setExtractedData(null);
      setError(null);
    }
    e.target.value = '';
  }, []);

  const processImage = async (file, label) => {
    // Step 1: Tesseract OCR
    let ocrText = null;
    setProcessingStatus(`Reading text from ${label}...`);
    try {
      ocrText = await extractTextFromImage(file);
    } catch {
      console.warn(`Tesseract OCR failed for ${label}, falling back to Gemini-only.`);
    }

    // Step 2: Gemini AI — returns array of IDs found
    setProcessingStatus(`AI extracting IDs from ${label}...`);
    const ids = await geminiOCR({ file, ocrText });
    return ids.map((id) => ({ ...id, _fileName: label }));
  };

  const processPageBlob = async (blob, label) => {
    // Tesseract on the rendered page image
    let ocrText = null;
    setProcessingStatus(`Reading text from ${label}...`);
    try {
      const blobFile = new File([blob], `${label}.png`, { type: 'image/png' });
      ocrText = await extractTextFromImage(blobFile);
    } catch {
      console.warn(`Tesseract OCR failed for ${label}, falling back to Gemini-only.`);
    }

    // Convert blob to base64 for Gemini
    setProcessingStatus(`AI extracting IDs from ${label}...`);
    const base64 = await blobToBase64(blob);
    const ids = await geminiOCR({ base64, mimeType: 'image/png', ocrText });
    return ids.map((id) => ({ ...id, _fileName: label }));
  };

  const handleProcess = async () => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('');

    try {
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileLabel = files.length > 1 ? `${file.name} (${i + 1}/${files.length})` : file.name;
        const fileKey = getFileKey(file);

        // Check cache — skip re-processing identical files
        if (cacheRef.current.has(fileKey)) {
          setProcessingStatus(`Using cached results for ${file.name}...`);
          results.push(...cacheRef.current.get(fileKey));
          continue;
        }

        const fileResults = [];
        const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          || file.name.endsWith('.docx') || file.name.endsWith('.doc');

        if (file.type === 'application/pdf') {
          // PDF: convert each page to image, then extract IDs from each page
          setProcessingStatus(`Converting PDF pages: ${file.name}...`);
          const pages = await pdfToPageImages(file, (pageNum, total) => {
            setProcessingStatus(`Rendering page ${pageNum}/${total} of ${file.name}...`);
          });

          for (const { blob, pageNum } of pages) {
            const pageLabel = `${file.name} — Page ${pageNum}`;
            const pageIds = await processPageBlob(blob, pageLabel);
            fileResults.push(...pageIds);
          }
        } else if (isDocx) {
          // DOCX: extract embedded images, then process each
          setProcessingStatus(`Extracting images from ${file.name}...`);
          const images = await docxToImages(file);

          if (images.length === 0) {
            throw new Error(`No images found in ${file.name}. Please paste ID photos into the Word document.`);
          }

          for (const { blob, index } of images) {
            const imgLabel = `${file.name} — Image ${index}`;
            const imgIds = await processPageBlob(blob, imgLabel);
            fileResults.push(...imgIds);
          }
        } else {
          // Image file: may contain multiple IDs
          const imageIds = await processImage(file, fileLabel);
          fileResults.push(...imageIds);
        }

        // Cache results for this file
        cacheRef.current.set(fileKey, fileResults);
        results.push(...fileResults);
      }

      setExtractedData(results);
      setProcessingStatus('');

      // Save scans to localStorage
      const newScans = results.map((data) => {
        const scanName = data.fullName && data.fullName !== 'Not found'
          ? data.fullName.split(' ')[0]
          : 'Unknown';
        return {
          id: Date.now() + Math.random(),
          documentType: `ID - ${scanName}`,
          timestamp: Date.now(),
          data,
        };
      });
      const savedScans = JSON.parse(localStorage.getItem('ocrScans') || '[]');
      localStorage.setItem('ocrScans', JSON.stringify([...newScans, ...savedScans]));
    } catch (err) {
      setError(err.message || 'Failed to extract data from image');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 pt-20">
        <HeroSection 
          onUploadClick={handleUploadClick}
          files={files}
          extractedData={extractedData}
          isProcessing={isProcessing}
          processingStatus={processingStatus}
          error={error}
          onProcess={handleProcess}
          onClear={() => { setFiles(null); setExtractedData(null); setError(null); }}
        />

        <TrustedBySection />
        
        <FeaturesSection />

        <AboutSection />

      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <Footer />
    </div>
  );
};

export default HomePage;
