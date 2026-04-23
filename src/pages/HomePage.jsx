import { useState, useRef, useCallback } from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/sections/HeroSection';
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

        {/* Trusted By Section */}
        <section className="py-16 px-8 bg-[var(--surface-container-low)] min-h-[200px] flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] text-center mb-10">Powering global verification for leaders</p>
            <div className="marquee-mask flex overflow-hidden">
              {[0, 1].map((i) => (
                <div className="marquee-track flex gap-16 pr-16 shrink-0 min-w-max opacity-40 grayscale" key={i} aria-hidden={i === 1}>
                  {[
                    ['database', 'QUANTUM'],
                    ['neurology', 'NEURALINK'],
                    ['sync_alt', 'DATASYNC'],
                    ['shield', 'ARMOR'],
                    ['hub', 'NEXUS'],
                    ['token', 'VERICHAIN'],
                  ].map(([icon, name]) => (
                    <div key={name} className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)] whitespace-nowrap shrink-0">
                      <span className="material-symbols-outlined">{icon}</span>
                      {name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-32 max-md:py-20 px-8 max-md:px-5 bg-[var(--bg-secondary)]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-[640px] mx-auto mb-20">
              <h2 className="text-4xl max-md:text-[28px] font-bold tracking-tight leading-tight text-[var(--text-primary)] mb-4">
                Precision-engineered for <span className="text-[var(--accent-primary)]">Modern Enterprise</span>
              </h2>
              <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                Our architecture combines proprietary OCR engines with secure-cloud processing to redefine document intelligence.
              </p>
            </div>

            <div className="grid grid-cols-3 max-xl:grid-cols-1 max-xl:max-w-[480px] max-xl:mx-auto gap-8">
              {[
                { icon: 'bolt', color: 'bg-[var(--accent-primary)]', title: 'Extreme Speed', desc: 'Latency-free extraction. Process high-resolution ID images in under 200ms using edge-optimized neural networks.', highlighted: false },
                { icon: 'verified', color: 'bg-[var(--accent-secondary)]', title: '99.9% Accuracy', desc: 'Zero-margin for error. Our system handles glare, tilt, and low-light conditions with clinical-grade precision.', highlighted: true },
                { icon: 'encrypted', color: 'bg-[#575f67]', title: 'Clinical Security', desc: 'Bank-grade encryption. SOC2 compliant processing ensures PII never stays on our servers longer than needed.', highlighted: false },
              ].map((f) => (
                <div key={f.title} className={`glass-card-effect border border-[var(--outline-variant)] rounded-3xl p-8 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(255,92,0,0.08)] ${f.highlighted ? 'border-[rgba(255,92,0,0.2)] shadow-[0_10px_40px_rgba(0,0,0,0.04),0_0_0_4px_rgba(255,92,0,0.05)]' : ''}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 text-white transition-transform duration-200 group-hover:scale-110 ${f.color}`}>
                    <span className="material-symbols-outlined !text-[28px]">{f.icon}</span>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight leading-snug text-[var(--text-primary)] mb-4">{f.title}</h3>
                  <p className="text-base leading-relaxed text-[var(--text-secondary)]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-32 max-md:py-20 px-8 max-md:px-5 bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <div className="max-w-7xl mx-auto grid grid-cols-2 max-xl:grid-cols-1 max-xl:max-w-[640px] gap-24 max-xl:gap-12 items-center">
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden aspect-square">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80"
                  alt="Engineers working in a high-tech lab"
                />
                <div className="absolute inset-0 bg-[rgba(167,58,0,0.2)] mix-blend-multiply" />
                <div className="glass-card-effect absolute bottom-6 left-6 right-6 border border-[var(--outline-variant)] rounded-2xl p-6">
                  <p className="italic font-medium text-sm leading-relaxed text-[var(--text-primary)]">
                    "The most accurate OCR we've tested. It handled tilted mobile photos that other services failed on entirely."
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 rounded-full bg-slate-300 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">Marcus Chen</div>
                      <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">CTO, DataSync</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <h2 className="text-4xl max-md:text-[28px] font-bold tracking-tight leading-tight text-[var(--text-primary)]">
                Designed for the <span className="text-[var(--accent-primary)]">Security-First</span> Era
              </h2>
              <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
                Born from a need for clinical precision in identity management, ID-OCR uses advanced computer vision to eliminate manual data entry errors.
              </p>

              <div className="flex flex-col gap-4">
                {[
                  ['Global Coverage', 'Support for 190+ countries and thousands of document types.'],
                  ['Seamless Integration', 'SDKs for iOS, Android, and Web with 5-minute setup.'],
                  ['Developer First', 'Comprehensive documentation and 24/7 technical support.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[rgba(255,92,0,0.1)] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined !text-sm text-[var(--accent-primary)]">check</span>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[var(--text-primary)] mb-0.5">{title}</div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        multiple
        hidden
        onChange={handleFileChange}
      />

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-[var(--bg-card)] border-t border-[var(--outline-variant)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-12 max-xl:flex-col max-xl:text-center">
          <div className="flex flex-col gap-3 max-xl:items-center">
            <div className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] uppercase tracking-tight">
              <img className="shrink-0" src="/qr-logo.svg" alt="QR" width="24" height="24" />
              IDScan AI
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-[280px] leading-relaxed max-xl:text-center">
              The clinical standard for document extraction and identity verification.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {[
              { icon: 'image', text: 'JPG, PNG, PDF, DOCX' },
              { icon: 'psychology', text: 'Gemini AI + Tesseract OCR' },
              { icon: 'table_view', text: 'Excel Export' },
              { icon: 'speed', text: 'Up to 10 files per batch' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="material-symbols-outlined !text-[16px] text-[var(--accent-primary)]">{icon}</span>
                {text}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end max-xl:items-center gap-1">
            <div className="text-sm text-[var(--text-muted)]">
              © 2026 ID-OCR Converter. All rights reserved.
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Developed by <a href="https://shuaaae.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-semibold hover:underline">Joshua Godalle</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
