import { CtaSection } from "@/components/CtaSection";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustSection } from "@/components/TrustSection";

export default function Home() {
  return (
    <div className="modern-page-wrapper">
      <SiteHeader />
      <main>
        <HeroSection />
        <HowItWorks />
        <TrustSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
