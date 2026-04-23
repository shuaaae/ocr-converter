import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileSpreadsheet, Download, ScanLine, CheckCircle, Clock, Trash2, Eye, X } from 'lucide-react';
import ExcelJS from 'exceljs';

const DEMO_NAMES = ['Jonathan Sterling', 'Maria Santos', 'James Nakamura', 'Elena Petrova', 'Carlos Mendez'];
const DEMO_IDS = ['TX-992-8812', 'PH-441-6723', 'JP-108-3301', 'RU-556-9940', 'MX-773-2158'];

const useTypingAnimation = (items, typingSpeed = 60, pauseMs = 2000) => {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    let idx = 0, charIdx = 0, deleting = false, timer;
    const tick = () => {
      const current = items[idx];
      if (!deleting) {
        charIdx++;
        setDisplay(current.slice(0, charIdx));
        if (charIdx === current.length) {
          timer = setTimeout(() => { deleting = true; tick(); }, pauseMs);
          return;
        }
      } else {
        charIdx--;
        setDisplay(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          idx = (idx + 1) % items.length;
        }
      }
      timer = setTimeout(tick, deleting ? 30 : typingSpeed);
    };
    tick();
    return () => clearTimeout(timer);
  }, [items, typingSpeed, pauseMs]);
  return display;
};

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
  const [showAllModal, setShowAllModal] = useState(false);
  // Re-read localStorage when extractedData changes or history is cleared
  const recentScans = useMemo(() =>
    JSON.parse(localStorage.getItem('ocrScans') || '[]'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extractedData, scanVersion]
  );

  const downloadScanExcel = useCallback(async (scans, label) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Extracted Data');
    const headers = ['ID NUMBER', 'FULL NAME', 'BIRTH DATE', 'ADDRESS', 'EXPIRATION OF ID'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    scans.forEach((s) => {
      const d = s.data || s;
      sheet.addRow([d.documentNumber, d.fullName, d.dateOfBirth, d.address, d.expiryDate]);
    });
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length + 2 : 12;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen, 40);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `IDScan_${label}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem('ocrScans');
    setScanVersion((v) => v + 1);
  }, []);

  const downloadExcel = async () => {
    if (!extractedData || extractedData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Extracted Data');

    const headers = ['ID NUMBER', 'FULL NAME', 'BIRTH DATE', 'ADDRESS', 'EXPIRATION OF ID'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    extractedData.forEach((item) => {
      sheet.addRow([item.documentNumber, item.fullName, item.dateOfBirth, item.address, item.expiryDate]);
    });

    // Auto-fit column widths
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length + 2 : 12;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen, 40);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `IDScan_AI_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              onClick={downloadExcel}
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
      <div className="flex-1 p-6 grid grid-cols-[2fr_3fr] max-md:grid-cols-1 gap-6 max-h-[420px] overflow-y-auto thin-scrollbar">
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

        {/* Recent Conversions */}
        {recentScans.length > 0 && (
          <div className="col-span-full border-t border-[var(--outline-variant)] pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
                <Clock size={12} className="text-[var(--accent-primary)]" />
                Recent Conversions
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAllModal(true)} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer bg-transparent border-none p-0">
                  <Eye size={10} />
                  View All
                </button>
                <button onClick={clearHistory} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0">
                  <Trash2 size={10} />
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto thin-scrollbar">
              {(() => {
                // Group scans by close timestamps (within 5s = same batch)
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
                return batches.map((batch) => {
                  const date = new Date(batch.timestamp);
                  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const count = batch.scans.length;
                  // Build a readable name from extracted full names
                  const names = batch.scans
                    .map((s) => (s.data?.fullName || '').split(' ')[0])
                    .filter((n) => n && n !== 'Not');
                  const title = names.length > 0
                    ? names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '')
                    : `${count} ID${count > 1 ? 's' : ''}`;
                  return (
                    <div key={batch.timestamp} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{count} ID{count > 1 ? 's' : ''} · {label}</span>
                      </div>
                      <button
                        onClick={() => downloadScanExcel(batch.scans, date.toISOString().slice(0, 10))}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--accent-primary)] text-white text-[10px] font-semibold cursor-pointer border-none hover:opacity-80 transition-opacity"
                      >
                        <Download size={10} />
                        Excel
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

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

  return (
    <>
    {/* View All Modal */}
    {showAllModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowAllModal(false)}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative z-10 w-full max-w-2xl max-h-[80vh] bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--outline-variant)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[var(--accent-primary)]" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-[var(--text-primary)]">All Conversions</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,92,0,0.1)] text-[var(--accent-primary)] font-semibold">{allBatches.length}</span>
            </div>
            <button onClick={() => setShowAllModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-container)] transition-colors cursor-pointer bg-transparent border-none">
              <X size={18} className="text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-6">
            {allBatches.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No conversions yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {allBatches.map((batch) => {
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
                          onClick={() => downloadScanExcel(batch.scans, date.toISOString().slice(0, 10))}
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
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
            <span className="text-[10px] text-[var(--text-muted)]">{recentScans.length} total ID{recentScans.length !== 1 ? 's' : ''} across {allBatches.length} conversion{allBatches.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => { clearHistory(); setShowAllModal(false); }}
              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <Trash2 size={10} />
              Clear All
            </button>
          </div>
        </div>
      </div>
    )}

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
        <div className="relative">
          <div className="absolute -inset-4 bg-[rgba(255,92,0,0.1)] rounded-[2rem] blur-[48px] transition-all duration-300 z-0" />
          <div className="glass-card-effect relative z-[1] border border-[var(--outline-variant)] rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col hover:shadow-[0_20px_50px_rgba(255,92,0,0.08)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
                {hasFiles || hasResults || isProcessing ? 'Live — ID Analysis' : 'Dashboard — ID Analysis'}
              </div>
            </div>
            {renderCardContent()}
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default HeroSection;
