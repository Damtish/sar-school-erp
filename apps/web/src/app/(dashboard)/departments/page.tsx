"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type Department = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type DepartmentListResponse = {
  items: Department[];
  total: number;
};

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    active: true,
  });

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const getToken = () =>
    getStoredToken() ?? window.localStorage.getItem("accessToken");

  const loadDepartments = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/departments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | DepartmentListResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to load departments.");
      }

      setItems((payload as DepartmentListResponse).items ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load departments.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDepartments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDepartments]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const token = getToken();

    if (!token) {
      setFormError("No auth token found. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | Department
        | null;

      if (!response.ok) {
        const message = Array.isArray(
          (payload as { message?: string | string[] } | null)?.message,
        )
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to create department.");
      }

      setForm({ code: "", name: "", active: true });
      await loadDepartments();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create department.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateDepartment(
    id: string,
    payload: { code?: string; name?: string; active?: boolean },
  ) {
    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      return;
    }

    const response = await fetch(`${apiBase}/departments/${id}`, {
      method: "PUT",
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
      throw new Error(message ?? "Failed to update department.");
    }
  }

  async function handleToggle(item: Department) {
    try {
      await updateDepartment(item.id, { active: !item.active });
      await loadDepartments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update department.",
      );
    }
  }

  async function handleEdit(item: Department) {
    const name = window.prompt("Department name", item.name);
    if (name === null) return;
    const code = window.prompt("Department code", item.code);
    if (code === null) return;

    try {
      await updateDepartment(item.id, {
        name: name.trim(),
        code: code.trim(),
      });
      await loadDepartments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update department.",
      );
    }
  }

  async function handleDelete(item: Department) {
    const ok = window.confirm(
      `Delete department "${item.name}"? This fails if records reference it.`,
    );
    if (!ok) return;

    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/departments/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const message = Array.isArray(body?.message)
          ? body?.message[0]
          : body?.message;
        throw new Error(message ?? "Failed to delete department.");
      }

      await loadDepartments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete department.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-sar-ink">Departments</h1>
        <p className="mt-1 text-sm text-sar-muted">
          Manage academic departments for student and program assignment.
        </p>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Add Department</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            required
            placeholder="Code (e.g. MED)"
            value={form.code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, code: event.target.value }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            required
            placeholder="Department name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
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
              {submitting ? "Saving..." : "Add Department"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sar-ink">Department List</h2>
          <span className="text-sm text-sar-muted">{items.length} departments</span>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-lg bg-sar-soft px-4 py-6 text-sm text-sar-muted">
            Loading departments...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No departments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
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
