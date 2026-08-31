import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../features/landing/Navbar';
import { Hero } from '../features/landing/Hero';
import { ProductPreview } from '../features/landing/ProductPreview';
import { FeatureGrid } from '../features/landing/FeatureGrid';
import { HowItWorks } from '../features/landing/HowItWorks';
import { Footer } from '../features/landing/Footer';
import { CreateRoomModal } from '../features/room-entry/CreateRoomModal';
import { RoomPage } from './RoomPage';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const roomParam = searchParams.get('room');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // If entering via an invite link (?room=CODE), render the room flow directly at the root URL.
  // This keeps the URL as /?room=CODE and completely avoids nested-path 404s on static hosts/refreshes.
  if (roomParam) {
    return <RoomPage />;
  }

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
