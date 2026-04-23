const POINTS = [
  ['Global Coverage', 'Support for 190+ countries and thousands of document types.'],
  ['Seamless Integration', 'SDKs for iOS, Android, and Web with 5-minute setup.'],
  ['Developer First', 'Comprehensive documentation and 24/7 technical support.'],
];

const AboutSection = () => {
  return (
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
            {POINTS.map(([title, desc]) => (
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
  );
};

export default AboutSection;
