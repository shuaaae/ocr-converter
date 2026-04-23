const BRANDS = [
  ['database', 'QUANTUM'],
  ['neurology', 'NEURALINK'],
  ['sync_alt', 'DATASYNC'],
  ['shield', 'ARMOR'],
  ['hub', 'NEXUS'],
  ['token', 'VERICHAIN'],
];

const TrustedBySection = () => {
  return (
    <section className="py-16 px-8 bg-[var(--surface-container-low)] min-h-[200px] flex items-center">
      <div className="max-w-7xl mx-auto w-full">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] text-center mb-10">Powering global verification for leaders</p>
        <div className="marquee-mask flex overflow-hidden">
          {[0, 1].map((i) => (
            <div className="marquee-track flex gap-16 pr-16 shrink-0 min-w-max opacity-40 grayscale" key={i} aria-hidden={i === 1}>
              {BRANDS.map(([icon, name]) => (
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
  );
};

export default TrustedBySection;
