const CAPABILITIES = [
  { icon: 'image', text: 'JPG, PNG, PDF, DOCX' },
  { icon: 'psychology', text: 'Gemini AI + Tesseract OCR' },
  { icon: 'table_view', text: 'Excel Export' },
  { icon: 'speed', text: 'Up to 10 files per batch' },
];

const Footer = () => {
  return (
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
          {CAPABILITIES.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="material-symbols-outlined !text-[16px] text-[var(--accent-primary)]">{icon}</span>
              {text}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-end max-xl:items-center gap-1 text-right max-xl:text-center">
          <div className="text-sm text-[var(--text-muted)] whitespace-nowrap">
            © 2026 JOSHUA GODALLE. All rights reserved.
          </div>
          <div className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            Developed by <a href="https://shuaaae.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] font-semibold hover:underline">Joshua Godalle</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
