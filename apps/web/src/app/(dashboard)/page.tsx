"use client";

import { useEffect, useMemo, useState } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type FinanceOverview = {
  totalStudents: number;
  totalDepartments: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  paidThisMonthAmount: number;
  paidThisMonthCount: number;
};

function formatMoney(value: number) {
  return `ETB ${value.toLocaleString()}`;
}

export default function DashboardPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);

  useEffect(() => {
    const token = getStoredToken() ?? window.localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function loadOverview() {
      try {
        const response = await fetch(`${apiBase}/finance/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | FinanceOverview
          | null;
        if (payload) {
          setOverview(payload);
        }
      } catch {
        // keep fallback card values when request fails
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, [apiBase]);

  const summaryStats = [
    {
      label: "Total Students",
      value: overview ? overview.totalStudents.toLocaleString() : "...",
      hint: "Live total from student records",
    },
    {
      label: "Paid This Month",
      value: overview ? formatMoney(overview.paidThisMonthAmount) : "...",
      hint: overview
        ? `${overview.paidThisMonthCount} posted payments`
        : "Loading finance totals",
    },
    {
      label: "Unpaid Invoices",
      value: overview ? formatMoney(overview.unpaidInvoicesAmount) : "...",
      hint: overview
        ? `${overview.unpaidInvoicesCount} outstanding invoices`
        : "Loading outstanding totals",
    },
    {
      label: "Departments",
      value: overview ? overview.totalDepartments.toLocaleString() : "...",
      hint: "Active and inactive departments",
    },
  ];

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
            Finance cards now use real invoice and payment totals from the API.
          </p>
          <div className="mt-4 rounded-lg bg-sar-soft p-4 text-sm text-sar-muted">
            Use the Finance module to create invoices, record payments, and run
            balance lookups.
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
