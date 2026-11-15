import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { lazy, Suspense } from 'react';
const RoomPage = lazy(() => import('./pages/RoomPage').then(module => ({ default: module.RoomPage })));
import { NotFoundPage } from './pages/NotFoundPage';
import './App.css';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="room-loading" role="status">Loading workspace...</div>}><Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/room/:roomCode" element={<RoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
