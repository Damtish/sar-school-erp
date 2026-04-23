"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-sar-line bg-sar-surface md:flex md:w-64 md:flex-col">
      <div className="border-b border-sar-line px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sar-muted">
          African Medical College
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-sar-primary">SAR</h1>
      </div>

      <nav className="flex-1 px-3 py-5">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sar-primary text-white"
                      : "text-sar-muted hover:bg-sar-soft hover:text-sar-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
