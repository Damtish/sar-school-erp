"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredToken, getApiBaseUrl, getStoredToken } from "@/lib/auth";

type DashboardAuthGateProps = {
  children: ReactNode;
};

export function DashboardAuthGate({ children }: DashboardAuthGateProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();

    async function verifyToken() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          clearStoredToken();
          router.replace("/login");
          return;
        }

        setReady(true);
      } catch {
        clearStoredToken();
        router.replace("/login");
      }
    }

    void verifyToken();

    return () => controller.abort();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-sar-line bg-sar-surface p-6 text-sm text-sar-muted">
        Verifying session...
      </div>
    );
  }

  return <>{children}</>;
}
