import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sar-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-sar-line bg-sar-surface p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sar-muted">
            African Medical College
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-sar-primary">SAR</h1>
          <p className="mt-2 text-sm text-sar-muted">
            Placeholder login page for authentication integration.
          </p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-sar-ink"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@amc.edu"
              className="w-full rounded-lg border border-sar-line bg-white px-3 py-2.5 text-sm text-sar-ink outline-none ring-sar-primary transition focus:ring-2"
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
              placeholder="••••••••"
              className="w-full rounded-lg border border-sar-line bg-white px-3 py-2.5 text-sm text-sar-ink outline-none ring-sar-primary transition focus:ring-2"
            />
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-sar-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sar-primary-strong"
          >
            Sign in
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
