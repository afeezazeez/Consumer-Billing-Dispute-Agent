"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

interface StartCaseLinkProps {
  className?: string;
  children: ReactNode;
  initialHref?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function StartCaseLink({
  className,
  children,
  initialHref = "/login",
}: StartCaseLinkProps) {
  const [href, setHref] = useState(initialHref);

  useEffect(() => {
    let isCancelled = false;

    async function checkAuth() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });
        if (response.ok) {
          const payload = (await response.json()) as { success?: boolean };
          if (!isCancelled && payload.success) {
            setHref("/dashboard");
          }
        }
      } catch {
        // User not logged in
      }
    }

    void checkAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
