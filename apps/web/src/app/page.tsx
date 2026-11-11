import { cookies } from "next/headers";
import { HeroSection } from "@/components/HeroSection";
import { SiteHeader } from "@/components/SiteHeader";

export const instant = false;

export default async function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  let initialHref = "/login";

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("billing.sid");
    if (sessionCookie) {
      const authResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: { Cookie: `billing.sid=${sessionCookie.value}` },
        cache: "no-store",
      });
      if (authResponse.ok) {
        const payload = (await authResponse.json()) as { success?: boolean };
        if (payload.success) {
          initialHref = "/dashboard";
        }
      }
    }
  } catch {
    // If auth server is unreachable, default initialHref is /login
  }

  return (
    <div className="modern-page-wrapper landing-page-shell">
      <SiteHeader initialHref={initialHref} />
      <main className="landing-main">
        <HeroSection initialHref={initialHref} />
      </main>
    </div>
  );
}
