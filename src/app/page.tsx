import { wedding } from "@config/wedding";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Story from "@/components/Story";
import Schedule from "@/components/Schedule";
import Travel from "@/components/Travel";
import WeddingParty from "@/components/WeddingParty";
import Registry from "@/components/Registry";
import Gallery from "@/components/Gallery";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";
import RsvpBanner from "@/components/RsvpBanner";

export default function Home() {
  return (
    <>
      <Nav title={wedding.siteName} />
      <main id="main">
        <Hero />
        <Story />
        <Schedule />
        <Travel />
        <WeddingParty />
        <Registry />
        <Gallery />
        <Faq />
        <RsvpBanner />
      </main>
      <Footer />
      <InstallPrompt />
    </>
  );
}
