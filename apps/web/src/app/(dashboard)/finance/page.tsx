"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type StudentBrief = {
  id: string;
  studentId: string;
  name: string;
};

type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
  createdAt: string;
  student: StudentBrief | null;
};

type Payment = {
  id: string;
  invoiceId: string | null;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "MOBILE_MONEY";
  paidAt: string;
  createdAt: string;
  student: StudentBrief | null;
};

type FinanceOverview = {
  totalStudents: number;
  totalDepartments: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  paidThisMonthAmount: number;
  paidThisMonthCount: number;
};

type StudentBalance = {
  student: StudentBrief;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  invoices: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
    createdAt: string;
  }>;
};

function formatMoney(value: number) {
  return `ETB ${value.toLocaleString()}`;
}

export default function FinancePage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceResult, setBalanceResult] = useState<StudentBalance | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: "",
    amount: "",
    dueDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amount: "",
    method: "CASH",
    paidAt: "",
  });
  const [balanceLookup, setBalanceLookup] = useState({
    studentId: "",
    studentNumber: "",
  });

  const getToken = () =>
    getStoredToken() ?? window.localStorage.getItem("accessToken");

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [overviewRes, invoiceRes, paymentRes] = await Promise.all([
        fetch(`${apiBase}/finance/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${apiBase}/finance/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${apiBase}/finance/payments`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const overviewPayload = (await overviewRes.json().catch(() => null)) as
        | FinanceOverview
        | { message?: string | string[] }
        | null;
      const invoicePayload = (await invoiceRes.json().catch(() => null)) as
        | { items: Invoice[]; total: number }
        | { message?: string | string[] }
        | null;
      const paymentPayload = (await paymentRes.json().catch(() => null)) as
        | { items: Payment[]; total: number }
        | { message?: string | string[] }
        | null;

      if (!overviewRes.ok || !invoiceRes.ok || !paymentRes.ok) {
        const message =
          ((overviewPayload as { message?: string | string[] } | null)?.message ||
            (invoicePayload as { message?: string | string[] } | null)?.message ||
            (paymentPayload as { message?: string | string[] } | null)?.message) ??
          "Failed to load finance data.";
        throw new Error(Array.isArray(message) ? message[0] : message);
      }

      setOverview(overviewPayload as FinanceOverview);
      setInvoices((invoicePayload as { items: Invoice[] }).items ?? []);
      setPayments((paymentPayload as { items: Payment[] }).items ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load finance data.",
      );
      setOverview(null);
      setInvoices([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvoiceFormError(null);
    const token = getToken();
    if (!token) {
      setInvoiceFormError("No auth token found. Please log in again.");
      return;
    }

    setSubmittingInvoice(true);
    try {
      const response = await fetch(`${apiBase}/finance/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: invoiceForm.studentId.trim(),
          amount: Number(invoiceForm.amount),
          dueDate: invoiceForm.dueDate,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | Invoice
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to create invoice.");
      }

      setInvoiceForm({ studentId: "", amount: "", dueDate: "" });
      await loadData();
    } catch (requestError) {
      setInvoiceFormError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create invoice.",
      );
    } finally {
      setSubmittingInvoice(false);
    }
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentFormError(null);
    const token = getToken();
    if (!token) {
      setPaymentFormError("No auth token found. Please log in again.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const response = await fetch(`${apiBase}/finance/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceId: paymentForm.invoiceId,
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          paidAt: paymentForm.paidAt || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | Payment
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to record payment.");
      }

      setPaymentForm({
        invoiceId: "",
        amount: "",
        method: "CASH",
        paidAt: "",
      });
      await loadData();
    } catch (requestError) {
      setPaymentFormError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to record payment.",
      );
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleBalanceLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBalanceError(null);
    setBalanceResult(null);
    const token = getToken();

    if (!token) {
      setBalanceError("No auth token found. Please log in again.");
      return;
    }

    try {
      const url = new URL(`${apiBase}/finance/student-balance`);
      if (balanceLookup.studentId.trim()) {
        url.searchParams.set("studentId", balanceLookup.studentId.trim());
      }
      if (balanceLookup.studentNumber.trim()) {
        url.searchParams.set("studentNumber", balanceLookup.studentNumber.trim());
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = (await response.json().catch(() => null)) as
        | StudentBalance
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Balance lookup failed.");
      }

      setBalanceResult(payload as StudentBalance);
    } catch (requestError) {
      setBalanceError(
        requestError instanceof Error
          ? requestError.message
          : "Balance lookup failed.",
      );
    }
  }

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === "UNPAID" || invoice.status === "PARTIAL",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-sar-ink">Finance</h1>
        <p className="mt-1 text-sm text-sar-muted">
          Manage invoices, payment collection, and student balances.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <p className="text-sm text-sar-muted">Unpaid Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-sar-ink">
            {loading ? "..." : unpaidInvoices.length}
          </p>
          <p className="mt-1 text-sm text-sar-primary">
            {loading
              ? "Loading..."
              : formatMoney(overview?.unpaidInvoicesAmount ?? 0)}
          </p>
        </article>
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <p className="text-sm text-sar-muted">Paid This Month</p>
          <p className="mt-2 text-2xl font-semibold text-sar-ink">
            {loading ? "..." : formatMoney(overview?.paidThisMonthAmount ?? 0)}
          </p>
          <p className="mt-1 text-sm text-sar-primary">
            {loading ? "Loading..." : `${overview?.paidThisMonthCount ?? 0} payments`}
          </p>
        </article>
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <p className="text-sm text-sar-muted">Invoices Total</p>
          <p className="mt-2 text-2xl font-semibold text-sar-ink">
            {loading ? "..." : invoices.length}
          </p>
          <p className="mt-1 text-sm text-sar-primary">
            {loading ? "Loading..." : `${payments.length} payments recorded`}
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Create Invoice</h2>
          <form onSubmit={handleCreateInvoice} className="mt-4 grid gap-3">
            <input
              required
              value={invoiceForm.studentId}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  studentId: event.target.value,
                }))
              }
              placeholder="Student UUID"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={invoiceForm.amount}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  amount: event.target.value,
                }))
              }
              placeholder="Amount"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <input
              required
              type="date"
              value={invoiceForm.dueDate}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            {invoiceFormError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {invoiceFormError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submittingInvoice}
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong disabled:opacity-70"
            >
              {submittingInvoice ? "Saving..." : "Create Invoice"}
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Record Payment</h2>
          <form onSubmit={handleRecordPayment} className="mt-4 grid gap-3">
            <select
              required
              value={paymentForm.invoiceId}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  invoiceId: event.target.value,
                }))
              }
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            >
              <option value="">Select invoice</option>
              {invoices
                .filter((invoice) => invoice.status !== "PAID" && invoice.status !== "CANCELLED")
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.student?.studentId ?? invoice.studentId} |{" "}
                    {formatMoney(invoice.amount)} | {invoice.status}
                  </option>
                ))}
            </select>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              placeholder="Payment amount"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <select
              value={paymentForm.method}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  method: event.target.value as Payment["method"],
                }))
              }
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            >
              <option value="CASH">CASH</option>
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="CARD">CARD</option>
              <option value="MOBILE_MONEY">MOBILE MONEY</option>
            </select>
            <input
              type="datetime-local"
              value={paymentForm.paidAt}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, paidAt: event.target.value }))
              }
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            {paymentFormError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {paymentFormError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submittingPayment}
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong disabled:opacity-70"
            >
              {submittingPayment ? "Saving..." : "Record Payment"}
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Student Balance Lookup</h2>
          <form onSubmit={handleBalanceLookup} className="mt-4 grid gap-3">
            <input
              value={balanceLookup.studentId}
              onChange={(event) =>
                setBalanceLookup((prev) => ({
                  ...prev,
                  studentId: event.target.value,
                }))
              }
              placeholder="Student UUID (optional)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <input
              value={balanceLookup.studentNumber}
              onChange={(event) =>
                setBalanceLookup((prev) => ({
                  ...prev,
                  studentNumber: event.target.value,
                }))
              }
              placeholder="Student number (optional)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            {balanceError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {balanceError}
              </p>
            ) : null}
            <button
              type="submit"
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong"
            >
              Lookup Balance
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Balance Result</h2>
          {!balanceResult ? (
            <div className="mt-4 rounded-lg bg-sar-soft px-4 py-6 text-sm text-sar-muted">
              Run a lookup to view current balance.
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-sar-ink">
                <span className="font-semibold">Student:</span> {balanceResult.student.name} (
                {balanceResult.student.studentId})
              </p>
              <p className="text-sar-muted">
                Invoiced: {formatMoney(balanceResult.totalInvoiced)}
              </p>
              <p className="text-sar-muted">
                Paid: {formatMoney(balanceResult.totalPaid)}
              </p>
              <p className="text-sar-ink font-semibold">
                Balance: {formatMoney(balanceResult.balance)}
              </p>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Unpaid Invoices</h2>
        {unpaidInvoices.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No unpaid invoices.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Due Date</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-sar-line/70">
                    <td className="px-3 py-2 text-sar-ink">
                      {invoice.student?.studentId ?? invoice.studentId}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">
                      {formatMoney(invoice.amount)}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">{invoice.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
