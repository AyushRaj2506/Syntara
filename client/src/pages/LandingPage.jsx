import { useState } from 'react';
import { Navbar } from '../features/landing/Navbar';
import { Hero } from '../features/landing/Hero';
import { ProductPreview } from '../features/landing/ProductPreview';
import { FeatureGrid } from '../features/landing/FeatureGrid';
import { HowItWorks } from '../features/landing/HowItWorks';
import { Footer } from '../features/landing/Footer';
import { CreateRoomModal } from '../features/room-entry/CreateRoomModal';

export function LandingPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="landing-page">
      <Navbar onCreateRoom={() => setCreateModalOpen(true)} />
      <main>
        <Hero onCreateRoom={() => setCreateModalOpen(true)} />
        <ProductPreview />
        <FeatureGrid />
        <HowItWorks />
      </main>
      <Footer onCreateRoom={() => setCreateModalOpen(true)} />
      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
