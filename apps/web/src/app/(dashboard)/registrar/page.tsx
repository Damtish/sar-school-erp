"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, getStoredToken } from "@/lib/auth";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Program = {
  id: string;
  departmentId: string;
  name: string;
  code: string;
};

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  creditHour: number;
  semesterNumber: number | null;
  departmentId: string | null;
  programId: string | null;
  active: boolean;
};

type GradeLookupResponse = {
  student: {
    id: string;
    studentNumber: string;
    name: string;
  };
  grades: Array<{
    id: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    creditHour: number;
    academicYear: string;
    semester: string;
    gradeLetter: string;
    gradePoint: number;
    weightedPoints: number;
  }>;
  summary: {
    totalCredits: number;
    totalWeightedPoints: number;
    gpa: number;
  };
};

export default function RegistrarPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lookupResult, setLookupResult] = useState<GradeLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [courseFormError, setCourseFormError] = useState<string | null>(null);
  const [gradeFormError, setGradeFormError] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    creditHour: "",
    departmentId: "",
    programId: "",
    semesterNumber: "1",
    active: true,
  });

  const [gradeForm, setGradeForm] = useState({
    studentNumber: "",
    courseId: "",
    academicYear: "",
    semester: "SEMESTER_1",
    gradeLetter: "A",
  });

  const [lookupStudentNumber, setLookupStudentNumber] = useState("");

  const filteredPrograms = useMemo(() => {
    if (!courseForm.departmentId) return programs;
    return programs.filter((program) => program.departmentId === courseForm.departmentId);
  }, [programs, courseForm.departmentId]);

  const getToken = () =>
    getStoredToken() ?? (typeof window !== "undefined" ? window.localStorage.getItem("accessToken") : null);

  const loadRegistrarData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("No auth token found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [departmentRes, programRes, courseRes] = await Promise.all([
        fetch(`${apiBase}/departments`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch(`${apiBase}/programs`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch(`${apiBase}/registrar/courses`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);

      const departmentPayload = await departmentRes.json().catch(() => null);
      const programPayload = await programRes.json().catch(() => null);
      const coursePayload = await courseRes.json().catch(() => null);

      if (!departmentRes.ok || !programRes.ok || !courseRes.ok) {
        const message =
          departmentPayload?.message ??
          programPayload?.message ??
          coursePayload?.message ??
          "Failed to load registrar data.";
        throw new Error(Array.isArray(message) ? message[0] : message);
      }

      setDepartments((departmentPayload?.items ?? []) as Department[]);
      setPrograms((programPayload?.items ?? []) as Program[]);
      setCourses((coursePayload?.items ?? []) as Course[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load registrar data.");
      setDepartments([]);
      setPrograms([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRegistrarData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRegistrarData]);

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseFormError(null);
    const token = getToken();
    if (!token) {
      setCourseFormError("No auth token found. Please log in again.");
      return;
    }

    setSavingCourse(true);
    try {
      const response = await fetch(`${apiBase}/registrar/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseCode: courseForm.courseCode.trim(),
          courseName: courseForm.courseName.trim(),
          creditHour: Number(courseForm.creditHour),
          departmentId: courseForm.departmentId || undefined,
          programId: courseForm.programId || undefined,
          semesterNumber: Number(courseForm.semesterNumber),
          active: courseForm.active,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(message ?? "Failed to create course.");
      }

      setCourseForm({
        courseCode: "",
        courseName: "",
        creditHour: "",
        departmentId: "",
        programId: "",
        semesterNumber: "1",
        active: true,
      });
      await loadRegistrarData();
    } catch (requestError) {
      setCourseFormError(requestError instanceof Error ? requestError.message : "Failed to create course.");
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleCreateGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGradeFormError(null);
    const token = getToken();
    if (!token) {
      setGradeFormError("No auth token found. Please log in again.");
      return;
    }

    setSavingGrade(true);
    try {
      const response = await fetch(`${apiBase}/registrar/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentNumber: gradeForm.studentNumber.trim(),
          courseId: gradeForm.courseId,
          academicYear: gradeForm.academicYear.trim(),
          semester: gradeForm.semester,
          gradeLetter: gradeForm.gradeLetter,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(message ?? "Failed to record grade.");
      }

      await runLookup(gradeForm.studentNumber.trim(), token);
      setGradeForm({
        studentNumber: "",
        courseId: "",
        academicYear: "",
        semester: "SEMESTER_1",
        gradeLetter: "A",
      });
    } catch (requestError) {
      setGradeFormError(requestError instanceof Error ? requestError.message : "Failed to record grade.");
    } finally {
      setSavingGrade(false);
    }
  }

  async function runLookup(studentNumber: string, token?: string) {
    const authToken = token ?? getToken();
    if (!authToken) {
      setLookupError("No auth token found. Please log in again.");
      return;
    }

    setLookupError(null);
    setLookupResult(null);
    try {
      const response = await fetch(
        `${apiBase}/registrar/grades/student/${encodeURIComponent(studentNumber)}`,
        { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(message ?? "Failed to lookup student grades.");
      }
      setLookupResult(payload as GradeLookupResponse);
    } catch (requestError) {
      setLookupError(requestError instanceof Error ? requestError.message : "Failed to lookup student grades.");
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lookupStudentNumber.trim()) {
      setLookupError("Student number is required.");
      return;
    }
    await runLookup(lookupStudentNumber.trim());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-sar-ink">Registrar</h1>
        <p className="mt-1 text-sm text-sar-muted">
          Manage courses, grade entry, and student academic performance.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Create Course</h2>
          <form onSubmit={handleCreateCourse} className="mt-4 grid gap-3">
            <input
              required
              value={courseForm.courseCode}
              onChange={(event) => setCourseForm((prev) => ({ ...prev, courseCode: event.target.value }))}
              placeholder="Course Code (e.g. ANA101)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <input
              required
              value={courseForm.courseName}
              onChange={(event) => setCourseForm((prev) => ({ ...prev, courseName: event.target.value }))}
              placeholder="Course Name"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="number"
                min="0"
                value={courseForm.creditHour}
                onChange={(event) => setCourseForm((prev) => ({ ...prev, creditHour: event.target.value }))}
                placeholder="Credit Hour"
                className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
              />
              <input
                required
                type="number"
                min="1"
                value={courseForm.semesterNumber}
                onChange={(event) =>
                  setCourseForm((prev) => ({ ...prev, semesterNumber: event.target.value }))
                }
                placeholder="Semester Number"
                className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
              />
            </div>
            <select
              value={courseForm.departmentId}
              onChange={(event) =>
                setCourseForm((prev) => ({ ...prev, departmentId: event.target.value, programId: "" }))
              }
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            >
              <option value="">Department (optional)</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))}
            </select>
            <select
              value={courseForm.programId}
              onChange={(event) => setCourseForm((prev) => ({ ...prev, programId: event.target.value }))}
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            >
              <option value="">Program (optional)</option>
              {filteredPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} - {program.name}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-sar-muted">
              <input
                type="checkbox"
                checked={courseForm.active}
                onChange={(event) => setCourseForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 accent-sar-primary"
              />
              Active Course
            </label>
            {courseFormError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseFormError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={savingCourse}
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong disabled:opacity-70"
            >
              {savingCourse ? "Saving..." : "Create Course"}
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Grade Entry</h2>
          <form onSubmit={handleCreateGrade} className="mt-4 grid gap-3">
            <input
              required
              value={gradeForm.studentNumber}
              onChange={(event) => setGradeForm((prev) => ({ ...prev, studentNumber: event.target.value }))}
              placeholder="Student Number (e.g. AMC-0001)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <select
              required
              value={gradeForm.courseId}
              onChange={(event) => setGradeForm((prev) => ({ ...prev, courseId: event.target.value }))}
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            >
              <option value="">Select Course</option>
              {courses.filter((course) => course.active).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
            <input
              required
              value={gradeForm.academicYear}
              onChange={(event) => setGradeForm((prev) => ({ ...prev, academicYear: event.target.value }))}
              placeholder="Academic Year (e.g. 2025/2026)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={gradeForm.semester}
                onChange={(event) => setGradeForm((prev) => ({ ...prev, semester: event.target.value }))}
                className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
              >
                <option value="SEMESTER_1">Semester 1</option>
                <option value="SEMESTER_2">Semester 2</option>
                <option value="SUMMER">Summer</option>
              </select>
              <select
                value={gradeForm.gradeLetter}
                onChange={(event) => setGradeForm((prev) => ({ ...prev, gradeLetter: event.target.value }))}
                className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
              >
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C+">C+</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </div>
            {gradeFormError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {gradeFormError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={savingGrade}
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong disabled:opacity-70"
            >
              {savingGrade ? "Saving..." : "Record Grade"}
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">Student Result Lookup</h2>
          <form onSubmit={handleLookup} className="mt-4 grid gap-3">
            <input
              required
              value={lookupStudentNumber}
              onChange={(event) => setLookupStudentNumber(event.target.value)}
              placeholder="Student Number (e.g. AMC-0001)"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm outline-none ring-sar-primary focus:ring-2"
            />
            {lookupError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {lookupError}
              </p>
            ) : null}
            <button
              type="submit"
              className="rounded-lg bg-sar-primary px-4 py-2 text-sm font-semibold text-white hover:bg-sar-primary-strong"
            >
              Lookup Results
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sar-ink">GPA Summary</h2>
          {!lookupResult ? (
            <div className="mt-4 rounded-lg bg-sar-soft px-4 py-6 text-sm text-sar-muted">
              Search by student number to view GPA and transcript.
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-sar-ink">
                <span className="font-semibold">Student:</span> {lookupResult.student.name} (
                {lookupResult.student.studentNumber})
              </p>
              <p className="text-sar-muted">
                Total Credits: {lookupResult.summary.totalCredits}
              </p>
              <p className="text-sar-muted">
                Weighted Points: {lookupResult.summary.totalWeightedPoints.toFixed(2)}
              </p>
              <p className="font-semibold text-sar-ink">GPA: {lookupResult.summary.gpa.toFixed(2)}</p>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Course Catalog</h2>
        {loading ? (
          <p className="mt-4 text-sm text-sar-muted">Loading...</p>
        ) : courses.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No courses created yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Credit</th>
                  <th className="px-3 py-2 font-semibold">Semester</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-sar-line/70">
                    <td className="px-3 py-2 text-sar-ink">{course.courseCode}</td>
                    <td className="px-3 py-2 text-sar-muted">{course.courseName}</td>
                    <td className="px-3 py-2 text-sar-muted">{course.creditHour}</td>
                    <td className="px-3 py-2 text-sar-muted">{course.semesterNumber ?? "-"}</td>
                    <td className="px-3 py-2 text-sar-muted">
                      {course.active ? "ACTIVE" : "INACTIVE"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-sar-line bg-sar-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sar-ink">Student Grade Records</h2>
        {!lookupResult || lookupResult.grades.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-sar-line bg-sar-soft px-4 py-8 text-center text-sm text-sar-muted">
            No grade records found for selected student.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-sar-line text-left text-sar-muted">
                  <th className="px-3 py-2 font-semibold">Course</th>
                  <th className="px-3 py-2 font-semibold">Academic Year</th>
                  <th className="px-3 py-2 font-semibold">Semester</th>
                  <th className="px-3 py-2 font-semibold">Grade</th>
                  <th className="px-3 py-2 font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {lookupResult.grades.map((grade) => (
                  <tr key={grade.id} className="border-b border-sar-line/70">
                    <td className="px-3 py-2 text-sar-ink">
                      {grade.courseCode} - {grade.courseName}
                    </td>
                    <td className="px-3 py-2 text-sar-muted">{grade.academicYear}</td>
                    <td className="px-3 py-2 text-sar-muted">{grade.semester}</td>
                    <td className="px-3 py-2 text-sar-muted">{grade.gradeLetter}</td>
                    <td className="px-3 py-2 text-sar-muted">{grade.gradePoint.toFixed(2)}</td>
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
