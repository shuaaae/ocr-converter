import { Download, Clock, Trash2, Eye } from 'lucide-react';
import { downloadScanExcel } from '../../utils/excelExport';

const RecentConversions = ({ recentScans, onViewAll, onClearHistory }) => {
  if (recentScans.length === 0) return null;

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

  return (
    <div className="col-span-full border-t border-[var(--outline-variant)] pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)]">
          <Clock size={12} className="text-[var(--accent-primary)]" />
          Recent Conversions
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onViewAll} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer bg-transparent border-none p-0">
            <Eye size={10} />
            View All
          </button>
          <button onClick={onClearHistory} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0">
            <Trash2 size={10} />
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto thin-scrollbar">
        {batches.map((batch) => {
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
        })}
      </div>
    </div>
  );
};

export default RecentConversions;
