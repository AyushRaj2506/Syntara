import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Button } from '../../components/Button';
import { isValidRoomCode } from '../../lib/formatters';
import './Hero.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Hero({ onCreateRoom }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const upper = code.toUpperCase().trim();
    if (!upper) return;
    if (!isValidRoomCode(upper)) {
      setError('That room code doesn\'t look right.');
      return;
    }
    navigate(`/room/${upper}`);
  };

  return (
    <section className="hero" aria-label="Hero">
      {/* Ambient orbit motif */}
      <div className="hero__orbit-bg" aria-hidden="true">
        <BrandMark size={520} opacity={0.055} animated className="hero__orbit-svg" />
      </div>

      <div className="hero__content">
        {/* Eyebrow */}
        <span className="hero__eyebrow text-label">Real-Time Study Rooms</span>

        {/* Headline */}
        <h1 className="hero__headline text-display-xl">
          Learn together.<br />Focus together.
        </h1>

        {/* Subtext */}
        <p className="hero__subtext text-body-lg">
          Create a focused study room in seconds. Share a code, bring your notes,
          and get through the syllabus with people who are actually working too.
        </p>

        {/* CTAs */}
        <div className="hero__ctas">
          <Button
            size="lg"
            onClick={onCreateRoom}
            id="hero-create-room"
          >
            Create a Room
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => {
            document.querySelector('.hero__join-input')?.focus();
          }}>
            Join a Room
          </Button>
        </div>

        {/* Inline join input */}
        <form className="hero__join-form" onSubmit={handleJoin} aria-label="Join a room by code">
          <input
            className={`hero__join-input ${error ? 'hero__join-input--error' : ''}`}
            type="text"
            placeholder="Enter room code — e.g. DSA-7X92"
            value={code}
            maxLength={12}
            aria-label="Room code"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
          />
          {code && (
            <button type="submit" className="hero__join-btn" aria-label="Join room">
              <ArrowRight size={18} />
            </button>
          )}
          {error && (
            <span className="hero__join-error text-caption" role="alert">{error}</span>
          )}
        </form>
      </div>
    </section>
  );
}
