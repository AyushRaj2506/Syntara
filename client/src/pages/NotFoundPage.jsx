import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { BrandMark } from '../features/landing/BrandMark';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      gap: 'var(--space-4)',
      textAlign: 'center',
      padding: 'var(--space-6)'
    }}>
      <BrandMark size={40} opacity={0.7} />
      <h1 className="text-display-md" style={{ color: 'var(--color-text-primary)' }}>404 — Page Not Found</h1>
      <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
        The study room or page you’re looking for doesn’t exist or has expired.
      </p>
      <Button variant="primary" onClick={() => navigate('/')} style={{ marginTop: 'var(--space-2)' }}>
        Return Home
      </Button>
    </div>
  );
}
