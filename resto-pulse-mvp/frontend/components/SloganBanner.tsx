export function SloganBanner() {
  return (
    <section
      className="rounded-2xl border-2 border-accent bg-surface-card px-5 py-5 text-center shadow-[0_0_24px_rgba(255,107,53,0.12)]"
      style={{ backgroundColor: '#1E1E1E' }}>
      <p className="text-xl font-extrabold text-content sm:text-2xl">Türkiye&apos;nin Restoranları</p>
      <p className="mt-1 text-base font-semibold text-content-muted">
        Tek Tıkla <span className="text-accent">Gastro</span>
      </p>
    </section>
  );
}
