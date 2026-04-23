"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";

function getPageTitle(pathname: string) {
  const current = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

  return current?.label ?? "Dashboard";
}

export function TopHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-sar-line bg-sar-surface/95 backdrop-blur">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sar-muted">
              School Administration Resource
            </p>
            <h2 className="mt-1 text-xl font-semibold text-sar-ink">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-sar-line bg-white px-3 py-2 text-sm font-medium text-sar-muted"
            >
              Notifications
            </button>
            <div className="rounded-lg bg-sar-soft px-3 py-2 text-sm font-medium text-sar-ink">
              Finance Office
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-sar-primary text-white"
                    : "bg-white text-sar-muted border border-sar-line"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
