import { TrustBar } from "../_marketing/TrustBar";
import { Hero } from "../_marketing/Hero";
import { Guarantees } from "../_marketing/Guarantees";
import { Services } from "../_marketing/Services";
import { AppShowcase } from "../_marketing/AppShowcase";
import { Reviews } from "../_marketing/Reviews";
import { Comparison } from "../_marketing/Comparison";
import { Pricing } from "../_marketing/Pricing";
import { FAQ } from "../_marketing/FAQ";
import { FinalCTA } from "../_marketing/FinalCTA";
import { Footer } from "../_marketing/Footer";
import { Header } from "../_marketing/Header";
import { StructuredData } from "../_marketing/StructuredData";

export const metadata = {
  title: "Улётная Парковка — превью лендинга",
  description: "Внутреннее превью маркетинговой страницы. Не для индексации.",
  robots: { index: false, follow: false },
};

export default function LandingPreview() {
  return (
    <>
      <StructuredData />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Guarantees />
        <Services />
        <Pricing />
        <AppShowcase />
        <Reviews />
        <Comparison />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
