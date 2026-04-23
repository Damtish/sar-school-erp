type SummaryCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-sar-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-sar-ink">{value}</p>
      <p className="mt-2 text-xs font-medium text-sar-primary">{hint}</p>
    </article>
  );
}
