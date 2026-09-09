import { useState, useRef, useEffect } from 'react';
import { Camera, MessageCircle } from 'lucide-react';
import MobileChat from './MobileChat';
import { House, ScanLine, History, Info, Plus, ArrowUpRight, ChevronRight, FileText, FileSpreadsheet, Download, Search, X, CheckCheck, Upload, FolderOpen, Sparkles, Settings, Moon, Sun, Globe, Trash2 } from 'lucide-react';
import { downloadDocumentExcel } from '../../utils/excelExport';
import { getCleanDocumentData, humanizeFieldName } from '../../utils/documentData';
import './mobile-scanner.css';

const tabs = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'scan', label: 'Scan', Icon: ScanLine },
  { id: 'history', label: 'History', Icon: History },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

function readScans() {
  try {
    const saved = JSON.parse(localStorage.getItem('ocrScans') || '[]');
    return Array.isArray(saved) ? saved.filter(scan => scan && scan.data && Number.isFinite(scan.timestamp)) : [];
  } catch { return []; }
}

function ScanList({ scans, onDownload, onViewScan }) {
  return <div className="mobile-scan-list">{scans.map(scan => (
    <article className="mobile-document" key={scan.id}>
      <button className="mobile-document-content" onClick={() => onViewScan(scan)}>
        <span className="mobile-icon-tile"><FileText size={24} /></span>
        <div className="mobile-document-copy">
          <h3>{scan.documentType || 'Document'}</h3>
          <p>{new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(scan.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
          <span className="mobile-tag">Tap to view</span>
        </div>
      </button>
      <button className="mobile-icon-button" aria-label={`Download ${scan.documentType || 'document'} as Excel`} onClick={() => onDownload(scan)}><Download size={21} /></button>
    </article>
  ))}</div>;
}

function EmptyState({ searching = false }) {
  return <div className="mobile-empty">
    <span className="mobile-empty-icon"><FolderOpen size={34} strokeWidth={1.5} /></span>
    <h3>{searching ? 'No matching documents' : 'Your documents start here'}</h3>
    <p>{searching ? 'Try a different name or document number.' : 'Tap + to add your first document. Your completed scans will appear here.'}</p>
  </div>;
}

function DocumentFields({ data }) {
  const renderValue = (value, path) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="mobile-json-empty">No entries</span>;
      return <div className="mobile-json-array">{value.map((item, index) => (
        <section key={`${path}-${index}`} className="mobile-json-item">
          <span className="mobile-json-item-label">Item {index + 1}</span>
          {item && typeof item === 'object' ? renderEntries(item, `${path}-${index}`) : <p>{String(item ?? '—')}</p>}
        </section>
      ))}</div>;
    }
    if (value && typeof value === 'object') return renderEntries(value, path);
    return <span className={value === null ? 'mobile-json-empty' : ''}>{value === null ? 'Not provided' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>;
  };
  const renderEntries = (object, path = 'root') => <dl className="mobile-json-fields">{Object.entries(object).map(([key, value]) => {
    const complex = value && typeof value === 'object';
    return <div className={complex ? 'mobile-json-section' : 'mobile-json-field'} key={`${path}-${key}`}>
      <dt>{humanizeFieldName(key)}</dt>
      <dd>{renderValue(value, `${path}-${key}`)}</dd>
    </div>;
  })}</dl>;
  return renderEntries(data);
}

export default function MobileScanner({ tab, onTabChange, onUploadClick, onCameraClick, files, extractedData, isProcessing, processingStatus, error, onProcess, onClear, onDownloadExcel, onDownloadJson, onHistoryChange }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceCard = useRef(null);
  const addButton = useRef(null);
  
  // Settings state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [owlLanguage, setOwlLanguage] = useState(() => localStorage.getItem('owlLanguage') || 'english');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Save language preference
  useEffect(() => {
    localStorage.setItem('owlLanguage', owlLanguage);
  }, [owlLanguage]);
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const handleResetData = () => {
    localStorage.removeItem('ocrScans');
    localStorage.removeItem('owlLanguage');
    setOwlLanguage('english');
    onHistoryChange();
    setShowResetConfirm(false);
    alert('All data has been reset!');
  };
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) setSourceOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!sourceOpen) return;
    const dismissOutside = event => {
      if (!sourceCard.current?.contains(event.target) && !addButton.current?.contains(event.target)) setSourceOpen(false);
    };
    const dismissEscape = event => {
      if (event.key === 'Escape') {
        setSourceOpen(false);
        addButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [sourceOpen]);
  const openSourceOptions = () => setSourceOpen(true);
  const chooseSource = (action) => {
    setSourceOpen(false);
    addButton.current?.focus();
    action();
  };
  const [query, setQuery] = useState('');
  const [exportError, setExportError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [viewingScan, setViewingScan] = useState(null);
  const scans = readScans();
  const now = new Date();
  const todayCount = scans.filter(scan => new Date(scan.timestamp).toDateString() === now.toDateString()).length;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + index);
    return { label: date.toLocaleDateString('en-US', { weekday: 'narrow' }), count: scans.filter(scan => new Date(scan.timestamp).toDateString() === date.toDateString()).length };
  });
  const maxCount = Math.max(1, ...week.map(day => day.count));
  const filtered = scans.filter(scan => [scan.documentType, JSON.stringify(scan.data), new Date(scan.timestamp).toLocaleDateString()].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const navigate = (next) => {
    setSourceOpen(false);
    setConfirmClear(false);
    onTabChange(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const download = async (scan) => {
    setExportError('');
    try {
      await downloadDocumentExcel([scan.data]);
    } catch { setExportError('Could not download this document. Please try again.'); }
  };
  const downloadResults = async () => {
    setExportError('');
    try { await onDownloadExcel(); }
    catch { setExportError('Could not download your results. Please try again.'); }
  };

  const handleViewScan = (scan) => {
    setViewingScan(scan);
  };

  const handleBackFromScan = () => {
    setViewingScan(null);
  };

  const downloadScanExcel = async (scan) => {
    setExportError('');
    try {
      await downloadDocumentExcel([scan.data]);
    } catch { setExportError('Could not download this document. Please try again.'); }
  };

  return <div className="mobile-scanner">
    <main id="mobile-content" className="mobile-content">
      <MobileChat active={tab === 'chat'} onClose={() => navigate('home')} language={owlLanguage} />
      {exportError && <p className="mobile-error" role="alert">{exportError}</p>}
      {error && tab !== 'scan' && <p className="mobile-error" role="alert">{error}</p>}
      {tab === 'home' && <>
        <header className="mobile-heading">
          <p className="mobile-eyebrow">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}<span className="mobile-greeting-dot">.</span></h1>
        </header>

        <section className="mobile-mascot-banner" aria-label="Your scanning companion">
          <img className="mobile-dashboard-owl" src="/owldashboard.png" alt="Friendly blue owl waving in a teal scanner hoodie" fetchPriority="high" />
          <button className="mobile-owl-message" onClick={() => navigate('scan')}>
            <strong>Your scan buddy</strong>
            <span>{isProcessing ? 'I’m working on your documents. Let’s check your scan!' : todayCount > 0 ? `${todayCount} document${todayCount === 1 ? '' : 's'} scanned today. Ready to tackle the next one?` : 'A little scan, a lot less work. Ready to turn your paperwork into progress?'}</span>
            <small>{isProcessing ? 'View progress' : 'Let’s scan'} <ArrowUpRight size={14} /></small>
          </button>
        </section>

        <div className="mobile-stats">
          <section className="mobile-card mobile-week"><h2 className="mobile-eyebrow">Last 7 days</h2>
            <div className="mobile-chart" aria-label={`Scans in the last 7 days: ${week.map(day => day.count).join(', ')}`}>
              {week.map((day, index) => <div className={index === 6 ? 'is-today' : ''} key={index}><span className="mobile-bar-track"><span style={{ height: `${day.count ? Math.max(12, day.count / maxCount * 100) : 7}%` }}></span></span><span>{day.label}</span></div>)}
            </div>
          </section>
          <section className="mobile-card mobile-total"><h2>Today</h2><strong>{todayCount}<span>documents scanned</span></strong><span className="mobile-total-footer"><CheckCheck size={16} /> {scans.length} saved in total</span></section>
        </div>

        <button className="mobile-feature-row" onClick={() => navigate('scan')}>
          <span className="mobile-icon-tile"><FileSpreadsheet size={27} /></span><span><strong>From document to structured data</strong><small>Upload, extract, and export as JSON or Excel.</small><span className="mobile-tag">Any readable document</span></span><ChevronRight size={20} />
        </button>
        <div className="mobile-section-heading"><h2>Recent scans</h2><button onClick={() => navigate('history')}>View all <ChevronRight size={17} /></button></div>
        {scans.length ? <ScanList scans={scans.slice(0, 3)} onDownload={download} /> : <EmptyState />}
      </>}

      {tab === 'scan' && <>
        <header className="mobile-heading"><p className="mobile-eyebrow">Your digital workspace</p><h1>Scan documents</h1><p>A few taps from paper to spreadsheet.</p></header>
        {error && <p role="alert" className="mobile-error">{error}</p>}
        {isProcessing ? <section className="mobile-card mobile-processing" role="status" aria-live="polite"><span className="mobile-empty-icon"><ScanLine size={38} className="scan-animate" /></span><h2>Working on your documents</h2><p>{processingStatus || 'Preparing your scan…'}</p><div className="mobile-progress"><span className="progress-animate" /></div><small>You can browse your history while we work.</small></section>
          : extractedData ? <section className="mobile-card mobile-results"><span className="mobile-icon-tile"><CheckCheck size={28} /></span><h2>{extractedData.length ? 'Your scan is ready' : 'No documents found'}</h2><p>{extractedData.length} document{extractedData.length !== 1 ? 's' : ''} extracted. Review the AI-extracted values against the original document before using them.</p>
            {extractedData.map((data, index) => <details key={index} open={extractedData.length === 1}><summary>{data._documentType || data.fullName || data.firstName || `Document ${index + 1}`}</summary><DocumentFields data={getCleanDocumentData(data)} /></details>)}
            {extractedData.length > 0 && <div className="mobile-export-actions"><button className="mobile-primary-button" onClick={onDownloadJson}><Download size={19} /> Download JSON</button><button className="mobile-secondary-button" onClick={downloadResults}><FileSpreadsheet size={19} /> Download Excel</button></div>}<button className="mobile-secondary-button" onClick={onClear}>Scan another document</button>
          </section> : files?.length ? <section className="mobile-card mobile-files"><div className="mobile-section-heading"><h2>Ready to scan</h2><button onClick={onClear}>Clear</button></div><p>{files.length} of 10 files selected</p>{files.map((file, index) => <div className="mobile-file" key={index}><FileText size={22} /><span>{file.name}<small>{(file.size / 1024).toFixed(0)} KB</small></span></div>)}<button className="mobile-primary-button" onClick={onProcess}><ScanLine size={20} /> Extract document data</button><button className="mobile-secondary-button" onClick={openSourceOptions}>Choose different files</button></section>
            : <section className="mobile-upload-card">
                <img src="/owlscan.png" alt="Owl ready to scan" className="mobile-mascot-scan" />
                <strong>Add your documents</strong><span>Choose photos, PDFs, or Word files</span><button className="mobile-primary-button" onClick={onCameraClick}><Camera size={20} /> Take a photo</button><button className="mobile-secondary-button" onClick={onUploadClick}><Upload size={19} /> Upload files</button><small>Up to 10 files at a time</small></section>}
        <h2 className="mobile-subheading">Made for your paperwork</h2>
        <div className="mobile-feature-row"><span className="mobile-icon-tile"><FileText size={26} /></span><span><strong>Any readable document</strong><small>Extract labeled fields, sections, and table rows.</small></span></div>
        <div className="mobile-feature-row"><span className="mobile-icon-tile"><FileSpreadsheet size={26} /></span><span><strong>Choose your format</strong><small>Download structured results as JSON or Excel.</small></span></div>
        <p className="mobile-footnote">For best results, use a clear photo with all document edges visible.</p>
      </>}

      {tab === 'history' && <>
        {viewingScan ? (
          // Viewing a single scan
          <div className="mobile-scan-detail">
            <button className="mobile-back-button" onClick={handleBackFromScan}>
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /> Back to history
            </button>
            <header className="mobile-heading">
              <h1>{viewingScan.documentType || 'Document'}</h1>
              <p>{new Date(viewingScan.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(viewingScan.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
            </header>
            <section className="mobile-card mobile-results">
              <DocumentFields data={getCleanDocumentData(viewingScan.data)} />
              <div className="mobile-export-actions" style={{ marginTop: '20px' }}>
                <button className="mobile-primary-button" onClick={() => downloadScanExcel(viewingScan)}>
                  <FileSpreadsheet size={19} /> Download Excel
                </button>
              </div>
            </section>
          </div>
        ) : (
          // History list view
          <>
            <header className="mobile-heading"><p className="mobile-eyebrow">Everything in one place</p><h1>Scan history</h1><p>Your documents, ready when you need them.</p></header>
            <div className="mobile-search"><Search size={21} /><input aria-label="Search scan history" placeholder="Search name, ID, or document…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="mobile-icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={18} /></button>}</div>
            <div className="mobile-section-heading"><h2>{query ? 'Search results' : 'All documents'} <span className="mobile-count">{filtered.length}</span></h2>{scans.length > 0 && <button onClick={() => setConfirmClear(true)}>Clear history</button>}</div>
            {confirmClear && <section className="mobile-card mobile-clear-confirm" aria-label="Confirm clearing scan history"><h2>Clear saved history?</h2><p>This removes all saved scans from this browser. Download any documents you want to keep first.</p><button className="mobile-primary-button" onClick={() => {
              try {
                localStorage.removeItem('ocrScans');
                onHistoryChange();
                setConfirmClear(false);
                setQuery('');
              } catch { setExportError('Could not clear history. Please try again.'); }
            }}>Clear all saved scans</button><button className="mobile-secondary-button" onClick={() => setConfirmClear(false)}>Keep history</button></section>}
            {filtered.length ? <ScanList scans={filtered} onDownload={download} onViewScan={handleViewScan} /> : <EmptyState searching={Boolean(query)} />}
            <p className="mobile-footnote">History is saved in this browser on this device.</p>
          </>
        )}
      </>}

      {tab === 'settings' && <>
        <header className="mobile-heading"><p className="mobile-eyebrow">Customize your experience</p><h1>Settings</h1><p>Personalize Owlens to work your way.</p></header>
        
        {/* Theme Setting */}
        <section className="mobile-card mobile-setting-card">
          <div className="mobile-setting-row">
            <div className="mobile-setting-info">
              <span className="mobile-icon-tile">{theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}</span>
              <div>
                <h3>Theme</h3>
                <p>Choose your preferred color scheme</p>
              </div>
            </div>
            <button className="mobile-toggle-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              <span className={`mobile-toggle-track ${theme === 'dark' ? 'is-active' : ''}`}>
                <span className="mobile-toggle-thumb" />
              </span>
            </button>
          </div>
          <div className="mobile-setting-value">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</div>
        </section>

        {/* Language Setting */}
        <section className="mobile-card mobile-setting-card">
          <div className="mobile-setting-header">
            <span className="mobile-setting-icon"><Globe size={20} /></span>
            <div>
              <h3>Language</h3>
              <p>Choose how Owl talks in the app.</p>
            </div>
          </div>
          <div className="mobile-language-selector">
            <button 
              className={`mobile-language-btn ${owlLanguage === 'english' ? 'is-active' : ''}`}
              onClick={() => setOwlLanguage('english')}
            >
              English
            </button>
            <button 
              className={`mobile-language-btn ${owlLanguage === 'filipino' ? 'is-active' : ''}`}
              onClick={() => setOwlLanguage('filipino')}
            >
              Filipino
            </button>
          </div>
        </section>

        {/* Reset Data */}
        <section className="mobile-card mobile-setting-card mobile-danger-card">
          <div className="mobile-setting-row">
            <div className="mobile-setting-info">
              <span className="mobile-icon-tile mobile-icon-danger"><Trash2 size={24} /></span>
              <div>
                <h3>Reset Data</h3>
                <p>Clear all saved scans and settings</p>
              </div>
            </div>
          </div>
          {showResetConfirm ? (
            <div className="mobile-danger-confirm">
              <p><strong>Are you sure?</strong> This will permanently delete all your saved scans and reset settings. This action cannot be undone.</p>
              <div className="mobile-danger-actions">
                <button className="mobile-danger-button" onClick={handleResetData}>
                  <Trash2 size={18} /> Yes, reset everything
                </button>
                <button className="mobile-secondary-button" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="mobile-secondary-button" onClick={() => setShowResetConfirm(true)}>
              Reset all data
            </button>
          )}
        </section>

        {/* App Info */}
        <section className="mobile-card mobile-about-info">
          <div className="mobile-app-info">
            <img src="/owlens-logo.png" alt="Owlens" width="48" height="48" />
            <div>
              <h3>Owlens</h3>
              <p>Smart Document Scanning</p>
              <small>Version 1.0.0</small>
            </div>
          </div>
        </section>
      </>}
    </main>
    <div className="mobile-bottom-dock" style={{ display: tab === 'chat' ? 'none' : 'flex' }}>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.Icon size={25} strokeWidth={1.8} /><span>{item.label}</span></button>)}</nav>
      <button ref={addButton} className={`mobile-add-button${sourceOpen ? ' is-open' : ''}`} aria-label={sourceOpen ? 'Close document options' : 'Add documents'} aria-expanded={sourceOpen} aria-controls="mobile-source-options" disabled={isProcessing} onClick={() => setSourceOpen(open => !open)}><Plus size={30} strokeWidth={2.5} /></button>
      <div ref={sourceCard} id="mobile-source-options" className="mobile-source-card" role="region" aria-label="Add a document" hidden={!sourceOpen}>
        <button onClick={() => chooseSource(() => navigate('chat'))}><MessageCircle size={25} /><span><strong>Chat</strong><small>Ask your AI assistant</small></span></button>
        <button onClick={() => chooseSource(onCameraClick)}><Camera size={25} /><span><strong>Take a photo</strong><small>Use your phone camera</small></span></button>
        <button onClick={() => chooseSource(onUploadClick)}><Upload size={25} /><span><strong>Upload files</strong><small>Photos, PDFs, or Word files</small></span></button>
      </div>
    </div>
  </div>;
}
