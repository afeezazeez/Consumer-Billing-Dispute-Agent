"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ClientAuthGuardProps {
  apiUrl: string;
}

export function ClientAuthGuard({ apiUrl }: ClientAuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    async function checkSession() {
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          credentials: "include",
        });
        if (response.ok) {
          const payload = (await response.json()) as { success?: boolean };
          if (!isCancelled && payload.success) {
            router.replace("/dashboard");
          }
        }
      } catch {
        // Not authenticated or network error; keep user on login page
      }
    }

    void checkSession();

    return () => {
      isCancelled = true;
    };
  }, [apiUrl, router]);

  return null;
}
