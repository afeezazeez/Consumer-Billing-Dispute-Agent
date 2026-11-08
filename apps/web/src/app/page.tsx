import { cookies } from "next/headers";
import { CtaSection } from "@/components/CtaSection";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustSection } from "@/components/TrustSection";

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
    <div className="modern-page-wrapper">
      <SiteHeader initialHref={initialHref} />
      <main>
        <HeroSection initialHref={initialHref} />
        <HowItWorks />
        <TrustSection />
        <CtaSection initialHref={initialHref} />
      </main>
      <SiteFooter />
    </div>
  );
}
