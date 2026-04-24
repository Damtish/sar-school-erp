"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type StudentStatus =
  | "APPLICANT"
  | "ACTIVE"
  | "ON_LEAVE"
  | "GRADUATED"
  | "WITHDRAWN";
type Gender = "MALE" | "FEMALE" | "OTHER";
type Department = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};
type Program = {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  active: boolean;
};

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  phone: string | null;
  admissionYear: number | null;
  status: StudentStatus;
  departmentId: string | null;
  departmentName: string | null;
  programId: string | null;
  programName: string | null;
};

type StudentsResponse = {
  items: Student[];
  total: number;
};
type ListResponse<T> = {
  items: T[];
  total: number;
};

const STATUS_OPTIONS: StudentStatus[] = [
  "APPLICANT",
  "ACTIVE",
  "ON_LEAVE",
  "GRADUATED",
  "WITHDRAWN",
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "" as "" | Gender,
    dateOfBirth: "",
    phone: "",
    admissionYear: "",
    status: "ACTIVE" as StudentStatus,
    departmentId: "",
    programId: "",
  });

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const filteredPrograms = useMemo(
    () =>
      programs.filter(
        (program) =>
          !form.departmentId || program.departmentId === form.departmentId,
      ),
    [form.departmentId, programs],
  );

  const loadStudents = useCallback(async (searchText?: string) => {
    const token = getStoredToken() ?? window.localStorage.getItem("accessToken");
    if (!token) {
      setListError("No auth token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError(null);

    try {
      const url = new URL(`${apiBase}/students`);
      const trimmed = searchText?.trim();
      if (trimmed) {
        url.searchParams.set("q", trimmed);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | StudentsResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message = Array.isArray((payload as { message?: string | string[] } | null)?.message)
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to load students.");
      }

      setStudents((payload as StudentsResponse).items ?? []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Failed to load students.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const loadLookups = useCallback(async () => {
    const token = getStoredToken() ?? window.localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

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
        | null;
      const programPayload = (await programRes.json().catch(() => null)) as
        | ListResponse<Program>
        | null;

      if (depRes.ok) {
        setDepartments((depPayload?.items ?? []).filter((item) => item.active));
      }
      if (programRes.ok) {
        setPrograms((programPayload?.items ?? []).filter((item) => item.active));
      }
    } catch {
      setDepartments([]);
      setPrograms([]);
    }
  }, [apiBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudents(query);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [query, loadStudents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLookups();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLookups]);

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const token = getStoredToken() ?? window.localStorage.getItem("accessToken");
    if (!token) {
      setFormError("No auth token found. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${apiBase}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: form.studentId.trim(),
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || undefined,
          lastName: form.lastName.trim(),
          gender: form.gender || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          phone: form.phone.trim() || undefined,
          admissionYear: form.admissionYear ? Number(form.admissionYear) : undefined,
          status: form.status,
          departmentId: form.departmentId.trim() || undefined,
          programId: filteredPrograms.some(
            (program) => program.id === form.programId,
          )
            ? form.programId.trim() || undefined
            : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | Student
        | null;

      if (!response.ok) {
        const message = Array.isArray((payload as { message?: string | string[] } | null)?.message)
          ? (payload as { message?: string | string[] }).message?.[0]
          : (payload as { message?: string | string[] } | null)?.message;
        throw new Error(message ?? "Failed to create student.");
      }

      setForm({
        studentId: "",
        firstName: "",
        middleName: "",
        lastName: "",
        gender: "",
        dateOfBirth: "",
        phone: "",
        admissionYear: "",
        status: "ACTIVE",
        departmentId: "",
        programId: "",
      });

      await loadLookups();
      await loadStudents(query);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to create student.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-sar-ink">Students</h1>
        <p className="mt-1 text-sm text-sar-muted">
          Manage student records for SAR Phase 1.
        </p>

        <form onSubmit={submitSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, student ID, or phone"
            className="w-full rounded-lg border border-sar-line bg-white px-3 py-2 text-sm text-sar-ink outline-none ring-sar-primary transition focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong"
          >
            Search
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Add Student</h2>
        <form onSubmit={handleAddStudent} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            required
            value={form.studentId}
            onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
            placeholder="Student ID"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            required
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="First name"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            value={form.middleName}
            onChange={(event) => setForm((prev) => ({ ...prev, middleName: event.target.value }))}
            placeholder="Middle name"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            required
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Last name"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <select
            value={form.gender}
            onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as "" | Gender }))}
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          >
            <option value="">Gender</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <input
            type="number"
            value={form.admissionYear}
            onChange={(event) => setForm((prev) => ({ ...prev, admissionYear: event.target.value }))}
            placeholder="Admission year"
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as StudentStatus }))}
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={form.departmentId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                departmentId: event.target.value,
                programId: "",
              }))
            }
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
          >
            <option value="">Select department (optional)</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} - {department.name}
              </option>
            ))}
          </select>
          <select
            value={form.programId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, programId: event.target.value }))
            }
            disabled={!form.departmentId}
            className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2 disabled:cursor-not-allowed disabled:bg-sar-soft"
          >
            <option value="">
              {form.departmentId
                ? "Select program (optional)"
                : "Select department first"}
            </option>
            {filteredPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.code} - {program.name}
              </option>
            ))}
          </select>
          <div className="md:col-span-2 lg:col-span-3">
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
              {submitting ? "Saving..." : "Add Student"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sar-ink">Student Records</h2>
          <span className="text-sm text-sar-muted">{students.length} students</span>
        </div>

        {listError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-lg bg-sar-soft px-4 py-6 text-sm text-sar-muted">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No students found. Add your first student to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Student ID</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Admission Year</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">Program</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-sar-line/70">
                    <td className="px-3 py-2 text-sar-ink">{student.studentId}</td>
                    <td className="px-3 py-2 text-sar-ink">
                      {student.firstName} {student.middleName ? `${student.middleName} ` : ""}
                      {student.lastName}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">{student.phone ?? "-"}</td>
                    <td className="px-3 py-2 text-sar-muted">
                      {student.admissionYear ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">{student.status}</td>
                    <td className="px-3 py-2 text-sar-muted">
                      {student.departmentName ?? student.departmentId ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">
                      {student.programName ?? student.programId ?? "-"}
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
