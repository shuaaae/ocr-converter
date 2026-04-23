import { useState, useEffect, useRef, useCallback } from 'react';

const Navbar = () => {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const toggleRef = useRef(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleToggle = useCallback(() => {
    const btn = toggleRef.current;
    if (!btn) { setDark((d) => !d); return; }

    // Check if View Transition API is available
    if (!document.startViewTransition) {
      setDark((d) => !d);
      return;
    }

    // Get toggle button center coordinates
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Calculate the max radius to cover the entire viewport
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setDark((d) => !d);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  }, []);

  return (
    <nav className="navbar-glass fixed top-0 left-0 w-full z-50 h-20 border-b border-[var(--outline-variant)] shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-black tracking-tight text-[var(--text-primary)]">
          <img className="shrink-0" src="/qr-logo.svg" alt="QR" width="28" height="28" />
          IDScan AI
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-semibold tracking-[0.05em] text-[var(--text-muted)]">
          <span className="material-symbols-outlined !text-sm text-[var(--accent-primary)]">calendar_today</span>
          {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          <span className="text-[var(--outline-variant)] mx-1">|</span>
          <span className="material-symbols-outlined !text-sm text-[var(--accent-primary)]">schedule</span>
          {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        <button ref={toggleRef} className="bg-transparent border-none p-0 cursor-pointer" onClick={handleToggle} aria-label="Toggle theme">
          <span className="toggle-track flex items-center w-14 h-[30px] rounded-full bg-[var(--outline-variant)] p-[3px] transition-colors duration-300">
            <span className="toggle-thumb flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-card)] shadow-sm transition-transform duration-300">
              <span className="material-symbols-outlined !text-base text-[var(--accent-primary)]">
                {dark ? 'dark_mode' : 'light_mode'}
              </span>
            </span>
          </span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
