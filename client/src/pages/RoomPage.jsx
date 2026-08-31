import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { RoomLayout } from '../features/room/RoomLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { isValidRoomCode } from '../lib/formatters';

export function RoomPage() {
  const { roomCode: paramCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('room');
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(() => {
    return sessionStorage.getItem('syntara:displayName') || '';
  });
  const [nameEntered, setNameEntered] = useState(() => {
    return !!sessionStorage.getItem('syntara:displayName');
  });
  const [guestPlaceholder] = useState(() => `Guest ${Math.floor(1000 + Math.random() * 9000)}`);

  const activeCode = (paramCode || queryCode || '').trim();
  const formattedCode = activeCode ? activeCode.toUpperCase() : '';

  useEffect(() => {
    if (!formattedCode || !isValidRoomCode(formattedCode)) {
      navigate('/', { replace: true });
    }
  }, [formattedCode, navigate]);

  const handleJoinWithName = (e) => {
    e.preventDefault();
    const finalName = displayName.trim() || guestPlaceholder;
    sessionStorage.setItem('syntara:displayName', finalName);
    setDisplayName(finalName);
    setNameEntered(true);
  };

  // If user hasn't set their name in this session yet, show lightweight inline modal/prompt
  if (!nameEntered) {
    return (
      <div className="room-join-name-prompt">
        <div className="room-join-name-card glass-panel">
          <h2 className="text-heading-lg" style={{ color: 'var(--color-text-primary)' }}>
            Join Room {formattedCode}
          </h2>
          <p className="text-body-md text-secondary">
            Choose your display name for this study session.
          </p>
          <form onSubmit={handleJoinWithName} className="room-join-name-form">
            <Input
              label="Your name"
              placeholder={guestPlaceholder}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              autoFocus
            />
            <div className="room-join-name-actions">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button type="submit">
                Enter Room
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <RoomLayout />;
}
