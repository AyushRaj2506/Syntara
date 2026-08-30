import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X, LogIn } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Button } from '../../components/Button';
import { isValidRoomCode, formatRoomCodeInput } from '../../lib/formatters';
import { ThemeToggle } from '../../components/ThemeToggle';
import './Navbar.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Navbar({ onCreateRoom }) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  const popoverRef = useRef(null);
  const triggerBtnRef = useRef(null);
  const codeInputRef = useRef(null);
  const navigate = useNavigate();

  // Stable random guest name placeholder
  const [guestPlaceholder] = useState(() => `Guest ${Math.floor(1000 + Math.random() * 9000)}`);

  // Scroll elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close popover
  useEffect(() => {
    if (!joinOpen) return;

    const handleOutsideClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(e.target)
      ) {
        setJoinOpen(false);
        setError('');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setJoinOpen(false);
        setError('');
        triggerBtnRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [joinOpen]);

  const toggleJoin = useCallback(() => {
    setJoinOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          codeInputRef.current?.focus();
        }, 60);
      } else {
        setError('');
      }
      return next;
    });
  }, []);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const upper = code.toUpperCase().trim();
    if (!isValidRoomCode(upper)) {
      setError('Please enter a valid room code (e.g. DSA-7X92)');
      codeInputRef.current?.focus();
      return;
    }

    const finalName = displayName.trim() || guestPlaceholderRef.current;
    sessionStorage.setItem('syntara:displayName', finalName);

    setJoinOpen(false);
    navigate(`/room/${upper}`);
  };

  return (
    <header className={`navbar-wrapper ${isScrolled ? 'navbar-wrapper--scrolled' : ''}`}>
      <div className="navbar-container">
        <nav className="navbar" aria-label="Main navigation">
          {/* Brand */}
          <a href="/" className="navbar__brand" aria-label="Syntara home">
            <div className="navbar__brand-icon">
              <BrandMark size={24} interactive />
            </div>
            <div className="navbar__brand-text">
              <span className="navbar__wordmark">SYNTARA</span>
              <span className="navbar__badge text-caption">STUDY ROOMS</span>
            </div>
          </a>

          {/* Navigation Action Buttons */}
          <div className="navbar__actions">
            {/* Join Room Trigger & Anchored Popover */}
            <div className="navbar__join-wrapper">
              <button
                ref={triggerBtnRef}
                type="button"
                className={`navbar__join-btn ${joinOpen ? 'navbar__join-btn--active' : ''}`}
                onClick={toggleJoin}
                aria-expanded={joinOpen}
                aria-haspopup="dialog"
                id="nav-join-room-trigger"
              >
                <LogIn size={15} className="navbar__join-btn-icon" />
                <span>Join Room</span>
              </button>

              {/* Anchored Floating Popover */}
              {joinOpen && (
                <div
                  ref={popoverRef}
                  className="navbar__join-popover"
                  role="dialog"
                  aria-label="Join a room"
                >
                  <div className="navbar__popover-header">
                    <div className="navbar__popover-title-wrap">
                      <span className="navbar__popover-title text-heading-md">Join a Room</span>
                      <span className="text-caption text-tertiary">Enter your group's code</span>
                    </div>
                    <button
                      type="button"
                      className="navbar__popover-close"
                      onClick={() => setJoinOpen(false)}
                      aria-label="Close join popover"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form className="navbar__popover-form" onSubmit={handleJoinSubmit}>
                    <div className="navbar__popover-field">
                      <label htmlFor="nav-popover-code" className="text-caption font-semibold text-secondary">
                        Room Code <span className="text-accent">*</span>
                      </label>
                      <input
                        id="nav-popover-code"
                        ref={codeInputRef}
                        className={`navbar__popover-input text-mono ${error ? 'navbar__popover-input--error' : ''}`}
                        type="text"
                        placeholder="e.g. DSA-7X92"
                        value={code}
                        maxLength={12}
                        required
                        autoComplete="off"
                        onChange={(e) => {
                          setCode(formatRoomCodeInput(e.target.value));
                          setError('');
                        }}
                      />
                    </div>

                    <div className="navbar__popover-field">
                      <label htmlFor="nav-popover-name" className="text-caption font-semibold text-secondary">
                        Your Name <span className="text-tertiary font-normal">(Optional)</span>
                      </label>
                      <input
                        id="nav-popover-name"
                        className="navbar__popover-input"
                        type="text"
                        placeholder={guestPlaceholder}
                        value={displayName}
                        maxLength={24}
                        autoComplete="off"
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>

                    {error && (
                      <span className="navbar__popover-error text-caption" role="alert">
                        {error}
                      </span>
                    )}

                    <Button
                      type="submit"
                      size="md"
                      fullWidth
                      className="navbar__popover-submit"
                      id="nav-popover-submit"
                    >
                      <span>Join Room</span>
                      <ArrowRight size={15} />
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* Primary Create Room CTA */}
            <Button
              size="sm"
              onClick={onCreateRoom}
              className="navbar__create-btn"
              id="navbar-create-room"
            >
              <span>Create Room</span>
            </Button>

            <div className="navbar__divider" aria-hidden="true" />

            {/* Theme Switcher */}
            <ThemeToggle size="sm" />
          </div>
        </nav>
      </div>
    </header>
  );
}
