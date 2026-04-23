"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl, getStoredToken, setStoredToken } from "@/lib/auth";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@sar.local");
  const [password, setPassword] = useState("Admin123!");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const loginUrl = `${getApiBaseUrl()}/auth/login`;
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            accessToken?: string;
            user?: LoginResponse["user"];
            message?: string | string[];
          }
        | null;

      if (!response.ok) {
        const fallback = "Login failed. Please check your credentials.";
        const resolvedMessage = Array.isArray(data?.message)
          ? data?.message[0]
          : data?.message;

        throw new Error(resolvedMessage ?? fallback);
      }

      if (!data?.accessToken) {
        throw new Error("Login response missing token");
      }

      localStorage.setItem("accessToken", data.accessToken);
      setStoredToken(data.accessToken);
      window.location.href = "/";
    } catch (error) {
      if (error instanceof TypeError) {
        setErrorMessage(
          "Cannot reach API at http://localhost:3001/api. Ensure backend is running.",
        );
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reach the server.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sar-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-sar-line bg-sar-surface p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sar-muted">
            African Medical College
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-sar-primary">SAR</h1>
          <p className="mt-2 text-sm text-sar-muted">
            Sign in to continue to the school operations dashboard.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-sar-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@sar.local"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-sar-line bg-white px-3 py-2.5 text-sm text-sar-ink outline-none ring-sar-primary transition focus:ring-2"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-sar-ink"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-sar-line bg-white px-3 py-2.5 text-sm text-sar-ink outline-none ring-sar-primary transition focus:ring-2"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-sar-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sar-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sar-muted">
          Back to dashboard:{" "}
          <Link href="/" className="font-semibold text-sar-primary">
            View SAR
          </Link>
        </p>
      </div>
    </div>
  );
}
