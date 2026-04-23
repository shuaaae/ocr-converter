import { useState, useCallback, useMemo, useEffect } from 'react';
import { FileSpreadsheet, Download, ScanLine, CheckCircle, X, Search, Trash2, Clock, Send, Bot, User } from 'lucide-react';
import useTypingAnimation from '../../hooks/useTypingAnimation';
import { downloadExtractedExcel } from '../../utils/excelExport';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MOTIVATIONAL_QUOTES = [
  'Every great achievement starts with a single scan.',
  'Efficiency is doing things right; productivity is doing the right things.',
  'The secret of getting ahead is getting started.',
  'Small progress is still progress. Keep going!',
  'Automation is the key to scaling your success.',
  'Your time is valuable — let AI handle the repetitive work.',
  'Today is a great day to be productive!',
  'Work smarter, not harder. Let technology help you.',
];

const DEMO_NAMES = ['Jonathan Sterling', 'Maria Santos', 'James Nakamura', 'Elena Petrova', 'Carlos Mendez'];
const DEMO_IDS = ['TX-992-8812', 'PH-441-6723', 'JP-108-3301', 'RU-556-9940', 'MX-773-2158'];

const HeroSection = ({
  onUploadClick,
  files,
  extractedData,
  isProcessing,
  processingStatus,
  error,
  onProcess,
  onClear,
}) => {
  const hasFiles = files && files.length > 0;
  const hasResults = extractedData && extractedData.length > 0;
  const typedName = useTypingAnimation(DEMO_NAMES);
  const typedId = useTypingAnimation(DEMO_IDS, 50, 2000);
  const [scanVersion, setScanVersion] = useState(0);
  // panelMode: 'normal' | 'closed' | 'minimized' | 'fullscreen' | 'history' | 'historyFullscreen' | 'chat'
  const [panelMode, setPanelMode] = useState('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useCallback((node) => { node?.scrollIntoView({ behavior: 'smooth' }); }, []);
  const typedQuote = useTypingAnimation(MOTIVATIONAL_QUOTES, 40, 4000);

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    const userMsg = { role: 'user', text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const history = chatMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
      const chat = model.startChat({
        history,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      });
      const result = await chat.sendMessage(text);
      const reply = result.response.text();
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t respond right now. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, chatMessages]);

  // Lock body scroll when a fullscreen modal is open
  useEffect(() => {
    if (panelMode === 'fullscreen' || panelMode === 'historyFullscreen') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [panelMode]);

  // Re-read localStorage when extractedData changes or history is cleared
  const recentScans = useMemo(() =>
    JSON.parse(localStorage.getItem('ocrScans') || '[]'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extractedData, scanVersion]
  );

  const clearHistory = useCallback(() => {
    localStorage.removeItem('ocrScans');
    setScanVersion((v) => v + 1);
  }, []);

  // Group scans into batches for the modal
  const allBatches = useMemo(() => {
    const batches = [];
    let current = null;
    recentScans.forEach((scan) => {
      if (!current || Math.abs(scan.timestamp - current.timestamp) > 5000) {
        current = { timestamp: scan.timestamp, scans: [scan] };
        batches.push(current);
      } else {
        current.scans.push(scan);
      }
    });
    return batches;
  }, [recentScans]);

  // Render the glass card body content based on state
  const renderCardContent = () => {
    // State: Processing
    if (isProcessing) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6">
          <div className="text-[var(--accent-primary)]">
            <ScanLine size={36} className="scan-animate" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Scanning IDs...</h3>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-[240px]">
            {processingStatus || 'Extracting information from your documents.'}
          </p>
          <div className="w-[140px] h-1 bg-[var(--bg-secondary)] rounded overflow-hidden mt-1">
            <div className="progress-animate w-full h-full bg-[var(--accent-primary)] rounded" />
          </div>
        </div>
      );
    }

    // State: Results ready
    if (hasResults) {
      return (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--outline-variant)]">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-[11px] font-bold text-[var(--text-primary)]">
              {extractedData.length} ID{extractedData.length > 1 ? 's' : ''} extracted
            </span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {extractedData.map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--outline-variant)] overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-container-low)] text-[10px] font-semibold text-[var(--text-secondary)] border-b border-[var(--outline-variant)]">
                  <FileSpreadsheet size={12} />
                  <span className="truncate">{item._fileName || `Document ${i + 1}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  {[
                    ['Full Name', item.fullName],
                    ['Birth Date', item.dateOfBirth],
                    ['Address', item.address],
                    ['ID Number', item.documentNumber],
                    ['Nationality', item.nationality],
                    ['Expiry', item.expiryDate],
                  ].map(([label, value], j) => (
                    <div key={j} className="flex flex-col gap-0 px-3 py-1.5 border-b border-[var(--outline-variant)] last:border-b-0 [&:nth-last-child(-n+2)]:border-b-0">
                      <span className="text-[8px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)]">{label}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--accent-primary)] border-none rounded-lg text-white text-[10px] font-semibold tracking-[0.08em] uppercase cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => downloadExtractedExcel(extractedData)}
            >
              <Download size={12} />
              Download Excel
            </button>
            <button
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--bg-secondary)] border border-[var(--outline-variant)] rounded-lg text-[var(--text-secondary)] text-[10px] font-semibold uppercase cursor-pointer transition-colors duration-200 hover:text-[var(--text-primary)]"
              onClick={onClear}
            >
              <span className="material-symbols-outlined !text-[14px]">close</span>
              Clear
            </button>
          </div>
        </div>
      );
    }

    // State: Files selected, ready to extract
    if (hasFiles) {
      return (
        <div className="flex-1 flex flex-col p-4 gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-primary)]">
            <span className="material-symbols-outlined !text-[16px]">description</span>
            <span>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            <button
              className="ml-auto w-5 h-5 bg-[var(--bg-secondary)] border-none rounded-full flex items-center justify-center text-[var(--text-secondary)] cursor-pointer transition-colors duration-200 hover:text-[var(--text-primary)] shrink-0"
              onClick={onClear}
            >
              <span className="material-symbols-outlined !text-[12px]">close</span>
            </button>
          </div>
          {error && (
            <div className="px-3 py-2 bg-[rgba(239,68,68,0.08)] rounded-lg border border-[rgba(239,68,68,0.15)]">
              <p className="text-red-600 text-[10px] font-medium">{error}</p>
            </div>
          )}
          <ul className="list-none flex flex-col gap-1 flex-1 overflow-y-auto max-h-[140px]">
            {files.map((file, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--surface-container-low)] text-[var(--accent-primary)]">
                <span className="material-symbols-outlined !text-[14px]">
                  {file.type.startsWith('image/') ? 'image' : 'description'}
                </span>
                <span className="text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis flex-1">{file.name}</span>
                <span className="text-[9px] text-[var(--text-muted)] shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent-primary)] border-none rounded-lg text-white text-[10px] font-semibold tracking-[0.08em] uppercase cursor-pointer transition-transform duration-150 shadow-[0_4px_16px_rgba(255,92,0,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            onClick={onProcess}
            disabled={isProcessing}
          >
            <span className="material-symbols-outlined !text-[14px]">scan</span>
            Extract from {files.length} File{files.length > 1 ? 's' : ''}
          </button>
        </div>
      );
    }

    // State: Default — animated mock preview
    return (
      <div className="flex-1 p-6 grid grid-cols-[2fr_3fr] max-md:grid-cols-1 gap-6">
        <div className="flex flex-col gap-3">
          <div className="relative w-full aspect-[3/2] max-md:aspect-[16/9] rounded-xl bg-slate-200 overflow-hidden border border-[var(--outline-variant)]">
            <img className="w-full h-full object-cover object-top" src="/ID.png" alt="Sample ID" />
            <div className="pulse-border absolute inset-3 border-2 border-[rgba(255,92,0,0.5)] rounded-lg" />
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full" />
          <div className="h-1.5 bg-slate-100 rounded-full w-2/3" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-[rgba(255,92,0,0.05)] border border-[rgba(255,92,0,0.1)]">
            <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--accent-secondary)] mb-3">Extracted Data</div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)]">Full Name</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {typedName}<span className="inline-block w-[2px] h-[1em] bg-[var(--accent-primary)] ml-0.5 align-middle animate-pulse" />
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)]">ID Number</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {typedId}<span className="inline-block w-[2px] h-[1em] bg-[var(--accent-primary)] ml-0.5 align-middle animate-pulse" />
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)]">Confidence</span>
                <span className="font-bold text-green-600">99.82%</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)] text-center pt-2">
            Developed by <a href="https://shuaaae.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-bold hover:underline">Joshua Godalle</a>
          </div>
        </div>

      </div>
    );
  };

  return (
    <>
    <section className="py-20 px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col gap-8 lg:text-left text-center lg:items-start items-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(255,92,0,0.1)] text-[var(--accent-primary)] px-4 py-2 rounded-full text-[10px] font-semibold tracking-[0.15em] uppercase w-fit">
            <span className="ping-dot relative w-2 h-2" />
            Next-Gen Data Extraction
          </div>

          <h1 className="flex flex-col">
            <span className="text-[72px] max-lg:text-5xl max-md:text-4xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] leading-[1.1]">Extract Data with</span>
            <span className="text-[72px] max-lg:text-5xl max-md:text-4xl font-extrabold tracking-[-0.04em] text-[var(--accent-primary)] leading-[1.1]">Clinical Precision</span>
          </h1>

          <p className="text-lg max-md:text-base leading-relaxed text-[var(--text-secondary)] max-w-[540px] lg:mx-0 mx-auto">
            Automate identity verification with 99.9% accuracy. Upload single or bulk 
            ID photos, PDFs, or Word documents. Our AI extracts Name, Address, Birthday, 
            ID Number &amp; more — then exports everything to Excel.
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] max-w-[540px] lg:mx-0 mx-auto flex items-center gap-1.5">
            <span className="material-symbols-outlined !text-[16px] text-[var(--accent-primary)]">lightbulb</span>
            For best results, paste multiple IDs into a single PDF — faster and more efficient than uploading images one by one.
          </p>

          <div className="flex flex-col gap-3 pt-2 lg:items-start items-center">
            <button
              className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--accent-primary)] border-none rounded-xl text-white text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer transition-transform duration-150 shadow-[0_8px_24px_rgba(255,92,0,0.2)] hover:scale-105 active:scale-95"
              onClick={onUploadClick}
            >
              <span className="material-symbols-outlined">upload_file</span>
              Upload ID
            </button>
            {error && !hasFiles && (
              <div className="px-4 py-2 bg-[rgba(239,68,68,0.08)] rounded-lg border border-[rgba(239,68,68,0.15)]">
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Glass Dashboard Preview / Live Extraction Panel */}
        {panelMode !== 'closed' && panelMode !== 'fullscreen' && panelMode !== 'history' && panelMode !== 'chat' && (
          <div className="relative">
            <div className="absolute -inset-4 bg-[rgba(255,92,0,0.1)] rounded-[2rem] blur-[48px] transition-all duration-300 z-0" />
            <div className={`glass-card-effect relative z-[1] border border-[var(--outline-variant)] rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col hover:shadow-[0_20px_50px_rgba(255,92,0,0.08)] ${panelMode === 'minimized' ? 'panel-animate-minimize' : 'panel-animate-open'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
                <div className="flex gap-2">
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-red-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Close">
                    <span className="material-symbols-outlined !text-[10px] text-red-800">close</span>
                  </button>
                  <button onClick={() => setPanelMode(panelMode === 'minimized' ? 'normal' : 'minimized')} className="w-4 h-4 rounded-full bg-amber-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Minimize">
                    <span className="material-symbols-outlined !text-[10px] text-amber-800">remove</span>
                  </button>
                  <button onClick={() => setPanelMode('fullscreen')} className="w-4 h-4 rounded-full bg-emerald-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Full Screen">
                    <span className="material-symbols-outlined !text-[10px] text-emerald-800">fullscreen</span>
                  </button>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
                  {hasFiles || hasResults || isProcessing ? 'Live — ID Analysis' : 'Dashboard — ID Analysis'}
                </div>
              </div>
              {panelMode === 'minimized' ? (
                <div className="flex items-center gap-4 p-4">
                  <img className="w-16 h-10 object-cover object-top rounded-lg border border-[var(--outline-variant)]" src="/ID.png" alt="ID Preview" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)]">ID Analysis Panel</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Click yellow to expand</span>
                  </div>
                </div>
              ) : (
                renderCardContent()
              )}
            </div>
          </div>
        )}

        {/* Closed state — macOS dock with glass taskbar */}
        {panelMode === 'closed' && (
          <div className="flex items-center justify-center">
            <div className="glass-card-effect flex items-end gap-5 px-5 py-3 rounded-2xl border border-[var(--outline-variant)] shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setPanelMode('normal')}
                  className="dock-icon-bounce w-14 h-14 rounded-[14px] bg-gradient-to-b from-[var(--accent-primary)] to-[#c24500] border-none p-0 cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(255,92,0,0.3)] transition-transform hover:scale-110 active:scale-95"
                >
                  <span className="material-symbols-outlined !text-[24px] text-white">scan</span>
                </button>
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">Dashboard</span>
              </div>
              <div className="w-px h-10 bg-[var(--outline-variant)] opacity-50 self-center" />
              <div className="flex flex-col items-center gap-1.5 relative">
                <button
                  onClick={() => { setPanelMode('history'); setSearchQuery(''); }}
                  className="dock-icon-bounce w-14 h-14 rounded-[14px] bg-gradient-to-b from-[#6b7280] to-[#374151] border-none p-0 cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(55,65,81,0.3)] transition-transform hover:scale-110 active:scale-95"
                >
                  <span className="material-symbols-outlined !text-[24px] text-white">history</span>
                </button>
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">History</span>
                {recentScans.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">{recentScans.length > 99 ? '99+' : recentScans.length}</span>
                )}
              </div>
              <div className="w-px h-10 bg-[var(--outline-variant)] opacity-50 self-center" />
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setPanelMode('chat')}
                  className="dock-icon-bounce w-14 h-14 rounded-[14px] bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] border-none p-0 cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-transform hover:scale-110 active:scale-95"
                >
                  <span className="material-symbols-outlined !text-[24px] text-white">smart_toy</span>
                </button>
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">Joshua</span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {panelMode === 'chat' && (
          <div className="relative">
            <div className="absolute -inset-4 bg-[rgba(139,92,246,0.08)] rounded-[2rem] blur-[48px] transition-all duration-300 z-0" />
            <div className="glass-card-effect relative z-[1] border border-[var(--outline-variant)] rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col panel-animate-open">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
                <div className="flex gap-2">
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-red-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Close">
                    <span className="material-symbols-outlined !text-[10px] text-red-800">close</span>
                  </button>
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-amber-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Minimize">
                    <span className="material-symbols-outlined !text-[10px] text-amber-800">remove</span>
                  </button>
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-emerald-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Back to Dock">
                    <span className="material-symbols-outlined !text-[10px] text-emerald-800">fullscreen</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
                  Hi Ma'am RIA, This is Joshua your AI Assistant! 😉
                </div>
              </div>

              <div className="h-[300px] overflow-y-auto thin-scrollbar px-4 py-3 flex flex-col gap-2">
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-[var(--text-muted)] italic text-center">
                      {typedQuote}<span className="inline-block w-[2px] h-[1em] bg-[var(--accent-primary)] ml-0.5 align-middle animate-pulse" />
                    </p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && <Bot size={12} className="text-[var(--accent-primary)] shrink-0 mt-0.5" />}
                        <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[var(--accent-primary)] text-white rounded-br-sm'
                            : 'bg-[var(--surface-container)] text-[var(--text-primary)] rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.role === 'user' && <User size={12} className="text-[var(--text-muted)] shrink-0 mt-0.5" />}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-2 justify-start">
                        <Bot size={12} className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
                        <div className="px-3 py-1.5 rounded-xl rounded-bl-sm bg-[var(--surface-container)] text-[11px] text-[var(--text-muted)]">
                          <span className="animate-pulse">Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--outline-variant)]">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-1.5 rounded-lg bg-[var(--accent-primary)] border-none cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={12} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {panelMode === 'history' && (
          <div className="relative">
            <div className="absolute -inset-4 bg-[rgba(100,100,100,0.08)] rounded-[2rem] blur-[48px] transition-all duration-300 z-0" />
            <div className="glass-card-effect relative z-[1] border border-[var(--outline-variant)] rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col panel-animate-open">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
                <div className="flex gap-2">
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-red-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Close">
                    <span className="material-symbols-outlined !text-[10px] text-red-800">close</span>
                  </button>
                  <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-amber-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Minimize">
                    <span className="material-symbols-outlined !text-[10px] text-amber-800">remove</span>
                  </button>
                  <button onClick={() => setPanelMode('historyFullscreen')} className="w-4 h-4 rounded-full bg-emerald-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Full Screen">
                    <span className="material-symbols-outlined !text-[10px] text-emerald-800">fullscreen</span>
                  </button>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
                  History — Conversions
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-4 py-3 border-b border-[var(--outline-variant)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-container-low)] border border-[var(--outline-variant)]">
                  <Search size={14} className="text-[var(--text-muted)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name, ID number, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-0 bg-transparent border-none cursor-pointer">
                      <X size={12} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* History Body */}
              <div className="flex-1 overflow-y-auto thin-scrollbar p-4 max-h-[360px]">
                {(() => {
                  const q = searchQuery.toLowerCase().trim();
                  const filtered = q
                    ? allBatches.filter((batch) =>
                        batch.scans.some((s) => {
                          const d = s.data || {};
                          return (
                            (d.fullName || '').toLowerCase().includes(q) ||
                            (d.documentNumber || '').toLowerCase().includes(q) ||
                            (d.address || '').toLowerCase().includes(q) ||
                            new Date(batch.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase().includes(q)
                          );
                        })
                      )
                    : allBatches;

                  if (filtered.length === 0) {
                    return <p className="text-sm text-[var(--text-muted)] text-center py-8">{q ? 'No results found.' : 'No conversions yet.'}</p>;
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {filtered.map((batch) => {
                        const date = new Date(batch.timestamp);
                        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const count = batch.scans.length;
                        const names = batch.scans
                          .map((s) => s.data?.fullName || 'Unknown')
                          .filter((n) => n !== 'Not found');
                        return (
                          <div key={batch.timestamp} className="p-3 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-[var(--text-primary)]">{count} ID{count > 1 ? 's' : ''} extracted</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">{dateLabel}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {names.map((name, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,92,0,0.08)] text-[var(--accent-secondary)] font-medium">{name}</span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => downloadExtractedExcel(batch.scans.map((s) => s.data || s))}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-[10px] font-semibold cursor-pointer border-none hover:opacity-80 transition-opacity shrink-0"
                              >
                                <Download size={12} />
                                Excel
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* History Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--outline-variant)]">
                <span className="text-[10px] text-[var(--text-muted)]">{recentScans.length} total ID{recentScans.length !== 1 ? 's' : ''} across {allBatches.length} conversion{allBatches.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => { clearHistory(); setPanelMode('closed'); }}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <Trash2 size={10} />
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dock — add AI Assistant icon */}
      </div>
    </section>

    {/* Fullscreen Modal */}
    {panelMode === 'fullscreen' && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setPanelMode('normal')}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative z-10 w-full max-w-3xl max-h-[85vh] glass-card-effect border border-[var(--outline-variant)] rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col panel-animate-fullscreen"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
            <div className="flex gap-2">
              <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-red-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Close">
                <span className="material-symbols-outlined !text-[10px] text-red-800">close</span>
              </button>
              <button onClick={() => setPanelMode('minimized')} className="w-4 h-4 rounded-full bg-amber-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Minimize">
                <span className="material-symbols-outlined !text-[10px] text-amber-800">remove</span>
              </button>
              <button onClick={() => setPanelMode('normal')} className="w-4 h-4 rounded-full bg-emerald-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Exit Full Screen">
                <span className="material-symbols-outlined !text-[10px] text-emerald-800">fullscreen</span>
              </button>
            </div>
            <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
              {hasFiles || hasResults || isProcessing ? 'Live — ID Analysis' : 'Dashboard — ID Analysis'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            {renderCardContent()}
          </div>
        </div>
      </div>
    )}

    {/* History Fullscreen Modal */}
    {panelMode === 'historyFullscreen' && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setPanelMode('history')}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative z-10 w-full max-w-3xl max-h-[85vh] glass-card-effect border border-[var(--outline-variant)] rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col panel-animate-fullscreen"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
            <div className="flex gap-2">
              <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-red-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Close">
                <span className="material-symbols-outlined !text-[10px] text-red-800">close</span>
              </button>
              <button onClick={() => setPanelMode('closed')} className="w-4 h-4 rounded-full bg-amber-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Minimize">
                <span className="material-symbols-outlined !text-[10px] text-amber-800">remove</span>
              </button>
              <button onClick={() => setPanelMode('history')} className="w-4 h-4 rounded-full bg-emerald-400 border-none p-0 cursor-pointer hover:brightness-110 transition-all flex items-center justify-center" title="Exit Full Screen">
                <span className="material-symbols-outlined !text-[10px] text-emerald-800">fullscreen</span>
              </button>
            </div>
            <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
              History — Conversions
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-[var(--outline-variant)]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-container-low)] border border-[var(--outline-variant)]">
              <Search size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Search by name, ID number, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-0 bg-transparent border-none cursor-pointer">
                  <X size={12} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              )}
            </div>
          </div>

          {/* History Body */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-6">
            {(() => {
              const q = searchQuery.toLowerCase().trim();
              const filtered = q
                ? allBatches.filter((batch) =>
                    batch.scans.some((s) => {
                      const d = s.data || {};
                      return (
                        (d.fullName || '').toLowerCase().includes(q) ||
                        (d.documentNumber || '').toLowerCase().includes(q) ||
                        (d.address || '').toLowerCase().includes(q) ||
                        new Date(batch.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase().includes(q)
                      );
                    })
                  )
                : allBatches;

              if (filtered.length === 0) {
                return <p className="text-sm text-[var(--text-muted)] text-center py-8">{q ? 'No results found.' : 'No conversions yet.'}</p>;
              }

              return (
                <div className="flex flex-col gap-3">
                  {filtered.map((batch) => {
                    const date = new Date(batch.timestamp);
                    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const count = batch.scans.length;
                    const names = batch.scans
                      .map((s) => s.data?.fullName || 'Unknown')
                      .filter((n) => n !== 'Not found');
                    return (
                      <div key={batch.timestamp} className="p-4 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-[var(--text-primary)]">{count} ID{count > 1 ? 's' : ''} extracted</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{dateLabel}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {names.map((name, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,92,0,0.08)] text-[var(--accent-secondary)] font-medium">{name}</span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => downloadExtractedExcel(batch.scans.map((s) => s.data || s))}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold cursor-pointer border-none hover:opacity-80 transition-opacity shrink-0"
                          >
                            <Download size={12} />
                            Excel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* History Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--outline-variant)]">
            <span className="text-[10px] text-[var(--text-muted)]">{recentScans.length} total ID{recentScans.length !== 1 ? 's' : ''} across {allBatches.length} conversion{allBatches.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => { clearHistory(); setPanelMode('closed'); }}
              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <Trash2 size={10} />
              Clear All
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default HeroSection;
