import { EvidencePreview } from "@/components/EvidencePreview";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustSection } from "@/components/TrustSection";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <EvidencePreview />
        <HowItWorks />
        <TrustSection />
      </main>
      <SiteFooter />
    </>
  );
}
