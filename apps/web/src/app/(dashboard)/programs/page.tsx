"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type Department = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type Program = {
  id: string;
  departmentId: string;
  departmentName: string | null;
  code: string;
  name: string;
  durationYears: number | null;
  active: boolean;
};

type ListResponse<T> = {
  items: T[];
  total: number;
};

export default function ProgramsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [items, setItems] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    departmentId: "",
    code: "",
    name: "",
    durationYears: "",
    active: true,
  });

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const getToken = () =>
    getStoredToken() ?? window.localStorage.getItem("accessToken");

  const loadLookupsAndPrograms = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [depRes, programRes] = await Promise.all([
        fetch(`${apiBase}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${apiBase}/programs`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const depPayload = (await depRes.json().catch(() => null)) as
        | ListResponse<Department>
        | { message?: string | string[] }
        | null;
      const programPayload = (await programRes.json().catch(() => null)) as
        | ListResponse<Program>
        | { message?: string | string[] }
        | null;

      if (!depRes.ok) {
        const message = Array.isArray(
          (depPayload as { message?: string | string[] } | null)?.message,
        )
          ? (depPayload as { message?: string | string[] }).message?.[0]
          : (depPayload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to load departments.");
      }

      if (!programRes.ok) {
        const message = Array.isArray(
          (programPayload as { message?: string | string[] } | null)?.message,
        )
          ? (programPayload as { message?: string | string[] }).message?.[0]
          : (programPayload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to load programs.");
      }

      const depItems = (depPayload as ListResponse<Department>).items ?? [];
      setDepartments(depItems);
      setItems((programPayload as ListResponse<Program>).items ?? []);
      if (!form.departmentId && depItems.length > 0) {
        setForm((prev) => ({ ...prev, departmentId: depItems[0].id }));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load programs.",
      );
      setDepartments([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, form.departmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLookupsAndPrograms();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLookupsAndPrograms]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const token = getToken();

    if (!token) {
      setFormError("No auth token found. Please log in again.");
      return;
    }
    if (!form.departmentId) {
      setFormError("Please select a department.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/programs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departmentId: form.departmentId,
          code: form.code,
          name: form.name,
          durationYears: form.durationYears ? Number(form.durationYears) : undefined,
          active: form.active,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | Program
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to create program.");
      }

      setForm((prev) => ({
        ...prev,
        code: "",
        name: "",
        durationYears: "",
        active: true,
      }));
      await loadLookupsAndPrograms();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create program.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateProgram(
    id: string,
    payload: {
      departmentId?: string;
      code?: string;
      name?: string;
      durationYears?: number | null;
      active?: boolean;
    },
  ) {
    const token = getToken();
    if (!token) throw new Error("No auth token found. Please log in again.");

    const response = await fetch(`${apiBase}/programs/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | null;
      const message = Array.isArray(body?.message)
        ? body?.message[0]
        : body?.message;
      throw new Error(message ?? "Failed to update program.");
    }
  }

  async function handleToggle(item: Program) {
    try {
      await updateProgram(item.id, { active: !item.active });
      await loadLookupsAndPrograms();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update program.",
      );
    }
  }

  async function handleEdit(item: Program) {
    const name = window.prompt("Program name", item.name);
    if (name === null) return;
    const code = window.prompt("Program code", item.code);
    if (code === null) return;
    const durationInput = window.prompt(
      "Duration (years, empty for none)",
      item.durationYears?.toString() ?? "",
    );
    if (durationInput === null) return;

    try {
      await updateProgram(item.id, {
        name: name.trim(),
        code: code.trim(),
        durationYears: durationInput.trim()
          ? Number(durationInput.trim())
          : null,
      });
      await loadLookupsAndPrograms();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update program.",
      );
    }
  }

  async function handleDelete(item: Program) {
    const ok = window.confirm(
      `Delete program "${item.name}"? This fails if records reference it.`,
    );
    if (!ok) return;

    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/programs/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const message = Array.isArray(body?.message)
          ? body?.message[0]
          : body?.message;
        throw new Error(message ?? "Failed to delete program.");
      }

      await loadLookupsAndPrograms();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete program.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-sar-ink">Programs</h1>
        <p className="mt-1 text-sm text-sar-muted">
          Manage academic programs and assign them to departments.
        </p>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Add Program</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            required
            value={form.departmentId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, departmentId: event.target.value }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} - {department.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Code (e.g. MD)"
            value={form.code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, code: event.target.value }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            required
            placeholder="Program name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            type="number"
            min={1}
            placeholder="Duration (years)"
            value={form.durationYears}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, durationYears: event.target.value }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <label className="flex items-center gap-2 rounded-lg border border-sar-line bg-white px-3 py-2 text-sm text-sar-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, active: event.target.checked }))
              }
            />
            Active
          </label>
          <div className="md:col-span-3">
            {formError ? (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Add Program"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sar-ink">Program List</h2>
          <span className="text-sm text-sar-muted">{items.length} programs</span>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-lg bg-sar-soft px-4 py-6 text-sm text-sar-muted">
            Loading programs...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No programs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">Duration</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-sar-line/70">
                    <td className="px-3 py-2 text-sar-ink">{item.code}</td>
                    <td className="px-3 py-2 text-sar-ink">{item.name}</td>
                    <td className="px-3 py-2 text-sar-muted">
                      {item.departmentName ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">
                      {item.durationYears ? `${item.durationYears} years` : "-"}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">
                      {item.active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleEdit(item)}
                          className="rounded border border-sar-line px-2 py-1 text-xs text-sar-ink"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggle(item)}
                          className="rounded border border-sar-line px-2 py-1 text-xs text-sar-ink"
                        >
                          {item.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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
