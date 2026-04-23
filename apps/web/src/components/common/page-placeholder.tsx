type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="rounded-xl border border-sar-line bg-sar-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-sar-ink">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-sar-muted">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-sar-line bg-sar-soft p-5 text-sm text-sar-muted">
        Module scaffolding ready for Phase 1 implementation.
      </div>
    </section>
  );
}
