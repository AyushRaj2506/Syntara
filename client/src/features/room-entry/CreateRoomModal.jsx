import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ArrowRight, BookOpen, MessageCircle } from 'lucide-react';
import { socket } from '../../lib/socket';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import './CreateRoomModal.css';

const ROOM_TYPES = [
  { value: 'STUDY', label: 'Study Room' },
  { value: 'CHAT', label: 'Chat Room' },
];

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

  // Stable placeholder so it doesn't regenerate on every re-render
  const guestPlaceholderRef = useRef(`Guest ${Math.floor(1000 + Math.random() * 9000)}`);

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

    const finalDisplayName = displayName.trim() || guestPlaceholderRef.current;
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
      // Save token
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
      title={step === 'success' ? undefined : 'Create a Room'}
      size="md"
      closeOnBackdrop={step !== 'form'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="create-room-form" noValidate>
          {/* Room Type Selector */}
          <div key="field-room-type" className="create-room-type-group">
            <label className="input-field__label">Room Mode</label>
            <div className="create-room-type-cards">
              <button
                type="button"
                className={`create-room-type-card ${roomType === 'STUDY' ? 'create-room-type-card--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRoomTypeChange('STUDY')}
              >
                <div className="create-room-type-card__icon">
                  <BookOpen size={18} />
                </div>
                <div className="create-room-type-card__text">
                  <span className="create-room-type-card__title">Study Room</span>
                  <span className="create-room-type-card__desc">Notes, Whiteboard, Timer, Goals & Quiz</span>
                </div>
              </button>

              <button
                type="button"
                className={`create-room-type-card ${roomType === 'CHAT' ? 'create-room-type-card--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRoomTypeChange('CHAT')}
              >
                <div className="create-room-type-card__icon">
                  <MessageCircle size={18} />
                </div>
                <div className="create-room-type-card__text">
                  <span className="create-room-type-card__title">Chat Room</span>
                  <span className="create-room-type-card__desc">Casual chat, file sharing & documents</span>
                </div>
              </button>
            </div>
          </div>

          <div key="field-room-name">
            <Input
              id="room-name"
              label="Room name"
              type="text"
              placeholder={roomType === 'STUDY' ? 'e.g. DSA Final Prep' : 'e.g. Project Discussion & Files'}
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
            key="field-study-options"
            className={`create-room-study-fields ${roomType === 'STUDY' ? 'create-room-study-fields--open' : ''}`}
            aria-hidden={roomType !== 'STUDY'}
          >
            <Select
              id="room-subject"
              label="Subject"
              options={SUBJECTS}
              value={subject}
              onChange={handleSubjectChange}
              disabled={roomType !== 'STUDY'}
              tabIndex={roomType !== 'STUDY' ? -1 : undefined}
            />
            {subject === 'Custom' && (
              <Input
                id="room-custom-subject"
                label="Custom subject"
                type="text"
                placeholder="e.g. Organic Chemistry"
                value={customSubject}
                onChange={handleCustomSubjectChange}
                error={errors.customSubject}
                maxLength={30}
                autoComplete="off"
                disabled={roomType !== 'STUDY'}
                tabIndex={roomType !== 'STUDY' ? -1 : undefined}
              />
            )}
          </div>

          <div key="field-display-name">
            <Input
              id="room-display-name"
              label="Your name (optional)"
              type="text"
              placeholder={guestPlaceholderRef.current}
              value={displayName}
              onChange={handleDisplayNameChange}
              maxLength={24}
              autoComplete="off"
            />
          </div>

          {errors.general && (
            <p className="create-room-form__error text-body-sm" role="alert">{errors.general}</p>
          )}

          <Button type="submit" fullWidth loading={loading} size="lg" id="create-room-submit">
            {loading ? 'Creating…' : 'Create Room'}
          </Button>
        </form>
      ) : (
        <div className="create-room-success">
          <div className="create-room-success__badge-row">
            <span className="create-room-success__mode-badge text-label">
              {createdRoom?.type === 'CHAT' ? 'Chat Room' : 'Study Room'}
            </span>
            <span className="text-caption text-tertiary uppercase tracking-wider">Created</span>
          </div>

          <h2 className="text-display-md" style={{ color: 'var(--color-text-primary)' }}>
            {createdRoom?.name}
          </h2>

          <div className="create-room-success__code-block">
            <span className="create-room-success__code">{createdRoom?.roomCode}</span>
            <button
              type="button"
              className="create-room-success__copy-btn"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy room code'}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="text-body-sm" style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Share this code with your group. The room expires in {createdRoom?.durationMin >= 60 ? `${Math.floor(createdRoom.durationMin / 60)}h` : `${createdRoom?.durationMin}m`}.
          </p>

          <div className="create-room-success__actions">
            <Button variant="ghost" onClick={handleClose}>Close</Button>
            <Button onClick={handleEnter} id="enter-room-btn">
              Enter Room
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

