import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { Button } from '../../components/Button';
import { isValidRoomCode } from '../../lib/formatters';
import { ThemeToggle } from '../../components/ThemeToggle';
import './Navbar.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Navbar({ onCreateRoom }) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const openJoin = () => {
    setJoinOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const upper = code.toUpperCase().trim();
    if (!isValidRoomCode(upper)) {
      setError('That room code doesn\'t look right.');
      return;
    }
    navigate(`/room/${upper}`);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <a href="/" className="navbar__brand" aria-label="Syntara home">
        <BrandMark size={24} />
        <span className="navbar__wordmark text-label">SYNTARA</span>
      </a>

      <div className="navbar__actions">
        {joinOpen ? (
          <form className="navbar__join-form" onSubmit={handleJoinSubmit} role="search">
            <input
              ref={inputRef}
              className={`navbar__join-input ${error ? 'navbar__join-input--error' : ''}`}
              type="text"
              placeholder="e.g. DSA-7X92"
              value={code}
              maxLength={12}
              aria-label="Room code"
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setJoinOpen(false); setCode(''); setError(''); }
              }}
            />
            <Button type="submit" size="sm">Join</Button>
            {error && <span className="navbar__join-error text-caption" role="alert">{error}</span>}
          </form>
        ) : (
          <Button variant="ghost" size="sm" onClick={openJoin}>Join Room</Button>
        )}
        <ThemeToggle size="sm" />
      </div>
    </nav>
  );
}
