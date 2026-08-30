import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ArrowRight, BookOpen, MessageCircle, Shield, Users } from 'lucide-react';
import { socket } from '../../lib/socket';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import './CreateRoomModal.css';

const SUBJECTS = [
  { value: 'Data Structures', label: 'Data Structures' },
  { value: 'Algorithms', label: 'Algorithms' },
  { value: 'DBMS', label: 'DBMS' },
  { value: 'Operating Systems', label: 'Operating Systems' },
  { value: 'Computer Networks', label: 'Computer Networks' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Machine Learning', label: 'Machine Learning' },
  { value: 'General', label: 'General' },
  { value: 'Custom', label: 'Custom…' },
];

/** @param {{ open: boolean, onClose: () => void }} props */
export function CreateRoomModal({ open, onClose }) {
  const navigate = useNavigate();

  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const [roomType, setRoomType] = useState('STUDY');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('General');
  const [customSubject, setCustomSubject] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState({});

  // Stable guest placeholder
  const [guestPlaceholder] = useState(() => `Guest ${Math.floor(1000 + Math.random() * 9000)}`);

  const handleRoomTypeChange = useCallback((newType) => {
    setRoomType(newType);
  }, []);

  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
    setErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev));
  }, []);

  const handleSubjectChange = useCallback((e) => {
    setSubject(e.target.value);
    setErrors((prev) => (prev.customSubject ? { ...prev, customSubject: undefined } : prev));
  }, []);

  const handleCustomSubjectChange = useCallback((e) => {
    setCustomSubject(e.target.value);
    setErrors((prev) => (prev.customSubject ? { ...prev, customSubject: undefined } : prev));
  }, []);

  const handleDisplayNameChange = useCallback((e) => {
    setDisplayName(e.target.value);
  }, []);

  const validate = () => {
    const e = {};
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 3) {
      e.name = 'Room name must be at least 3 characters.';
    } else if (trimmedName.length > 40) {
      e.name = 'Room name must be at most 40 characters.';
    }

    if (roomType === 'STUDY' && subject === 'Custom') {
      const trimmedCustom = customSubject.trim();
      if (!trimmedCustom || trimmedCustom.length < 2) {
        e.customSubject = 'Custom subject must be at least 2 characters.';
      } else if (trimmedCustom.length > 30) {
        e.customSubject = 'Custom subject must be at most 30 characters.';
      }
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    if (!socket.connected) socket.connect();

    const finalDisplayName = displayName.trim() || guestPlaceholder;
    sessionStorage.setItem('syntara:displayName', finalDisplayName);

    const payload = {
      type: roomType,
      name: name.trim(),
      subject: roomType === 'CHAT' ? 'General' : subject,
      customSubject: roomType === 'STUDY' && subject === 'Custom' ? customSubject.trim() : undefined,
      durationMin: 360,
      maxParticipants: 50,
      displayName: finalDisplayName,
    };

    socket.emit('room:create', payload, (response) => {
      setLoading(false);
      if (response?.error) {
        setErrors({ general: response.error.message });
        return;
      }
      const { room, participantToken } = response;
      const tokenKey = `syntara:session:${room.roomCode}`;
      sessionStorage.setItem(tokenKey, participantToken);
      setCreatedRoom(room);
      setStep('success');
    });
  };

  const handleCopy = useCallback(() => {
    if (!createdRoom?.roomCode) return;
    navigator.clipboard.writeText(createdRoom.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [createdRoom?.roomCode]);

  const handleEnter = useCallback(() => {
    if (!createdRoom?.roomCode) return;
    navigate(`/room/${createdRoom.roomCode}`);
    onClose();
  }, [createdRoom?.roomCode, navigate, onClose]);

  const handleClose = useCallback(() => {
    setStep('form');
    setLoading(false);
    setCreatedRoom(null);
    setCopied(false);
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'success' ? undefined : 'Initialize Study Room'}
      subtitle={step === 'success' ? undefined : 'Instant ephemeral session. Up to 50 co-learners.'}
      size="md"
      closeOnBackdrop={step !== 'form'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="create-room-form" noValidate>
          {/* Room Mode Selector Cards */}
          <div className="create-room-type-group">
            <div className="create-room-type-label-row">
              <label className="input-field__label">Select Room Mode</label>
              <span className="text-caption text-tertiary">Switch anytime before creating</span>
            </div>

            <div className="create-room-type-cards">
              <button
                type="button"
                className={`create-room-type-card ${roomType === 'STUDY' ? 'create-room-type-card--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRoomTypeChange('STUDY')}
              >
                <div className="create-room-type-card__icon-wrap">
                  <BookOpen size={18} className="mode-icon-study" />
                </div>
                <div className="create-room-type-card__text">
                  <div className="create-room-type-card__header">
                    <span className="create-room-type-card__title">Study Room</span>
                    {roomType === 'STUDY' && <span className="mode-selected-pill">Active</span>}
                  </div>
                  <span className="create-room-type-card__desc">
                    Notes, Whiteboard, Synced Timer, Shared Goals & Quiz
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={`create-room-type-card ${roomType === 'CHAT' ? 'create-room-type-card--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRoomTypeChange('CHAT')}
              >
                <div className="create-room-type-card__icon-wrap">
                  <MessageCircle size={18} className="mode-icon-chat" />
                </div>
                <div className="create-room-type-card__text">
                  <div className="create-room-type-card__header">
                    <span className="create-room-type-card__title">Chat Room</span>
                    {roomType === 'CHAT' && <span className="mode-selected-pill">Active</span>}
                  </div>
                  <span className="create-room-type-card__desc">
                    Casual discussion, instant messages & file sharing
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Room Name Field */}
          <div className="create-room-field-wrap">
            <div className="create-room-field-header">
              <label htmlFor="room-name" className="input-field__label">
                Room Name <span className="required-star">*</span>
              </label>
              <span className="text-caption text-tertiary">{name.length}/40</span>
            </div>
            <Input
              id="room-name"
              type="text"
              placeholder={roomType === 'STUDY' ? 'e.g. Algorithms & Complexity Review' : 'e.g. Weekend Project Jam'}
              value={name}
              onChange={handleNameChange}
              error={errors.name}
              maxLength={40}
              required
              autoComplete="off"
            />
          </div>

          {/* Stable Study-specific fields container to prevent subtree remounting */}
          <div
            className={`create-room-study-fields ${roomType === 'STUDY' ? 'create-room-study-fields--open' : ''}`}
            aria-hidden={roomType !== 'STUDY'}
          >
            <div className="create-room-field-wrap">
              <Select
                id="room-subject"
                label="Primary Subject"
                options={SUBJECTS}
                value={subject}
                onChange={handleSubjectChange}
                disabled={roomType !== 'STUDY'}
                tabIndex={roomType !== 'STUDY' ? -1 : undefined}
              />
            </div>

            {subject === 'Custom' && (
              <div className="create-room-field-wrap">
                <Input
                  id="room-custom-subject"
                  label="Custom Subject Name"
                  type="text"
                  placeholder="e.g. Quantum Computing"
                  value={customSubject}
                  onChange={handleCustomSubjectChange}
                  error={errors.customSubject}
                  maxLength={30}
                  autoComplete="off"
                  disabled={roomType !== 'STUDY'}
                  tabIndex={roomType !== 'STUDY' ? -1 : undefined}
                />
              </div>
            )}
          </div>

          {/* Display Name Field */}
          <div className="create-room-field-wrap">
            <Input
              id="room-display-name"
              label="Your Display Name (Optional)"
              type="text"
              placeholder={guestPlaceholder}
              value={displayName}
              onChange={handleDisplayNameChange}
              maxLength={24}
              autoComplete="off"
              hint="You can always change your avatar and handle inside the room"
            />
          </div>

          {errors.general && (
            <div className="create-room-form__error text-body-sm" role="alert">
              {errors.general}
            </div>
          )}

          {/* Submit Action */}
          <div className="create-room-submit-wrap">
            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              id="create-room-submit"
              className="create-room-submit-btn"
            >
              <span>{loading ? 'Generating Room…' : 'Create Room Now'}</span>
              {!loading && <ArrowRight size={18} />}
            </Button>
            <p className="create-room-footnote text-caption">
              ⚡ Room link & code will be immediately ready to copy
            </p>
          </div>
        </form>
      ) : (
        /* Success Screen: Elegant Access Pass / Ticket */
        <div className="create-room-success">
          <div className="create-room-success__ticket">
            <div className="create-room-success__ticket-header">
              <div className="ticket-badge-wrap">
                <span className="ticket-badge text-label">
                  {createdRoom?.type === 'CHAT' ? 'Chat Room' : 'Study Room'}
                </span>
                <span className="ticket-live-pill">
                  <span className="live-pulse-dot" /> Live
                </span>
              </div>
              <span className="text-caption text-tertiary">Syntara Pass</span>
            </div>

            <h3 className="create-room-success__title text-display-md">
              {createdRoom?.name}
            </h3>

            {createdRoom?.subject && (
              <p className="create-room-success__subject text-body-sm">
                Subject: <strong>{createdRoom.subject}</strong>
              </p>
            )}

            {/* Room Code High-Visibility Voucher */}
            <div className="create-room-success__code-voucher">
              <div className="voucher-code-label text-label">INVITE CODE</div>
              <div className="voucher-code-digits text-mono">
                {createdRoom?.roomCode}
              </div>
              <button
                type="button"
                className={`voucher-copy-btn ${copied ? 'voucher-copy-btn--copied' : ''}`}
                onClick={handleCopy}
                aria-label={copied ? 'Code copied' : 'Copy room code'}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="create-room-success__perks">
              <div className="perk-item">
                <Shield size={13} className="text-accent" />
                <span className="text-caption">Ephemeral Session</span>
              </div>
              <div className="perk-item">
                <Users size={13} className="text-accent" />
                <span className="text-caption">Up to 50 Participants</span>
              </div>
            </div>
          </div>

          <div className="create-room-success__actions">
            <Button variant="secondary" onClick={handleClose} size="lg">
              Done
            </Button>
            <Button onClick={handleEnter} size="lg" id="enter-room-btn" className="enter-room-btn">
              <span>Enter Room</span>
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
