import { useState } from 'react';
import { Download, Clock, Trash2, X, Search } from 'lucide-react';
import { downloadScanExcel } from '../../utils/excelExport';

const ConversionsModal = ({ allBatches, recentScans, onClose, onClearHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-container)] transition-colors cursor-pointer bg-transparent border-none">
            <X size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-[var(--outline-variant)]">
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

        {/* Modal Body */}
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
            );
          })()}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
          <span className="text-[10px] text-[var(--text-muted)]">{recentScans.length} total ID{recentScans.length !== 1 ? 's' : ''} across {allBatches.length} conversion{allBatches.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => { onClearHistory(); onClose(); }}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            <Trash2 size={10} />
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversionsModal;
