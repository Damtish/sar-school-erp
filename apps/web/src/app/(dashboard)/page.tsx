import { SummaryCard } from "@/components/dashboard/summary-card";

const summaryStats = [
  {
    label: "Total Students",
    value: "1,248",
    hint: "+36 enrolled in the last 30 days",
  },
  {
    label: "Paid This Month",
    value: "ETB 2.4M",
    hint: "84% of invoices settled",
  },
  {
    label: "Unpaid This Month",
    value: "ETB 458K",
    hint: "142 pending balances",
  },
  {
    label: "Departments",
    value: "12",
    hint: "Medicine, Nursing, Pharmacy and more",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sar-line bg-gradient-to-r from-sar-primary to-sar-primary-strong px-6 py-7 text-white">
        <p className="text-sm font-medium text-white/80">
          African Medical College
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
          SAR Operations Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
          Monitor finance, registrar operations, and student records from one
          clean control center.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-sar-ink">
            Finance Snapshot
          </h3>
          <p className="mt-2 text-sm text-sar-muted">
            Fee collection and outstanding balances will be visualized here in
            Phase 1.
          </p>
          <div className="mt-4 rounded-lg bg-sar-soft p-4 text-sm text-sar-muted">
            Chart placeholder
          </div>
        </article>

        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-sar-ink">Registrar Queue</h3>
          <p className="mt-2 text-sm text-sar-muted">
            Pending registrations, profile updates, and document checks appear
            here.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-sar-muted">
            <li className="rounded-lg bg-sar-soft px-3 py-2">
              18 admission records awaiting verification
            </li>
            <li className="rounded-lg bg-sar-soft px-3 py-2">
              7 department transfers in progress
            </li>
            <li className="rounded-lg bg-sar-soft px-3 py-2">
              4 graduation audits due this week
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
