const FEATURES = [
  { icon: 'bolt', color: 'bg-[var(--accent-primary)]', title: 'Extreme Speed', desc: 'Latency-free extraction. Process high-resolution ID images in under 200ms using edge-optimized neural networks.', highlighted: false },
  { icon: 'verified', color: 'bg-[var(--accent-secondary)]', title: '99.9% Accuracy', desc: 'Zero-margin for error. Our system handles glare, tilt, and low-light conditions with clinical-grade precision.', highlighted: true },
  { icon: 'encrypted', color: 'bg-[#575f67]', title: 'Clinical Security', desc: 'Bank-grade encryption. SOC2 compliant processing ensures PII never stays on our servers longer than needed.', highlighted: false },
];

const FeaturesSection = () => {
  return (
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
          {FEATURES.map((f) => (
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
  );
};

export default FeaturesSection;
