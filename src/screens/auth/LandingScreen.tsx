import Navbar from '../../components/auth/landing/Navbar';
import Hero from '../../components/auth/landing/Hero';
import WhatWeOffer from '../../components/auth/landing/WhatWeOffer';
import ServicePackages from '../../components/auth/landing/ServicePackages';
import Membership from '../../components/auth/landing/Membership';
import Rewards from '../../components/auth/landing/Rewards';
import WhatMakesUsDifferent from '../../components/auth/landing/WhatMakesUsDifferent';
import HowItWorks from '../../components/auth/landing/HowItWorks';
import FinalCTA from '../../components/auth/landing/FinalCTA';
import Footer from '../../components/auth/landing/Footer';

export default function LandingScreen() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <WhatWeOffer />
        <ServicePackages />
        <Membership />
        <Rewards />
        <WhatMakesUsDifferent />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
