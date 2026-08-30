import { useState, useEffect } from 'react';
import {
  FileText,
  Timer,
  MessageSquare,
  Sparkles,
  Users2,
  Copy,
  Check
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import './ProductPreview.css';

const INITIAL_MESSAGES = [
  { id: '1', name: 'Alex Vance', role: 'Host', color: '#5B8FBF', text: 'Updated BST deletion edge cases in the notes.', time: '2m ago' },
  { id: '2', name: 'Priya Sharma', role: '', color: '#E8A33D', text: 'Starting our 25m focus sprint now.', time: '1m ago' },
  { id: '3', name: 'Marcus Chen', role: '', color: '#5EBA7D', text: 'Diagram is live on the whiteboard tab.', time: 'Just now' },
];

const STREAMING_MESSAGES = [
  { id: '4', name: 'Priya Sharma', role: '', color: '#E8A33D', text: 'Left-Right rotation: Left on z.left, then Right on z.', time: 'Just now' },
  { id: '5', name: 'Alex Vance', role: 'Host', color: '#5B8FBF', text: 'Added quiz question for AVL height balance.', time: 'Just now' },
  { id: '6', name: 'Elena Rostova', role: '', color: '#A06BC0', text: 'Joined room with MIT lecture slides.', time: 'Just now' },
];

export function ProductPreview() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(true);
  const [typingUser, setTypingUser] = useState('Priya Sharma');
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 + 38);
  const [participantCount, setParticipantCount] = useState(3);
  const [copiedCode, setCopiedCode] = useState(false);

  // Real-time ticking Pomodoro timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 25 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Coordinated live presence cycle
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      if (step === 0) {
        setIsTyping(true);
        setTypingUser('Priya Sharma');
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [...prev.slice(-2), STREAMING_MESSAGES[0]]);
        }, 3000);
      } else if (step === 1) {
        setHasNewJoiner(true);
        setParticipantCount(4);
        setMessages((prev) => [...prev.slice(-2), STREAMING_MESSAGES[2]]);
      } else if (step === 2) {
        setIsTyping(true);
        setTypingUser('Alex Vance');
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [...prev.slice(-2), STREAMING_MESSAGES[1]]);
        }, 2600);
      } else if (step === 3) {
        setMessages(INITIAL_MESSAGES);
        setHasNewJoiner(false);
        setParticipantCount(3);
      }
      step = (step + 1) % 4;
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const copyRoomCode = () => {
    navigator.clipboard?.writeText('DSA-7X92');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section className="live-demo-section" aria-label="Living Study Room Demonstration">
      <div className="container-fluid">
        {/* Section Header */}
        <div className="live-demo__header">
          <span className="text-label text-accent">Live Presence</span>
          <h2 className="text-display-lg live-demo__title">
            A room that stays alive
          </h2>
          <p className="text-body-md live-demo__subtitle">
            Synchronized notes, coordinated focus sprints, and instant messaging — working quietly in the background.
          </p>
        </div>

        {/* Compact Living Room Card */}
        <div className="live-demo__card">
          {/* Room Banner Titlebar */}
          <div className="live-demo__banner">
            <div className="live-demo__banner-left">
              <span className="live-demo__status-beacon" />
              <span className="live-demo__room-name">Algorithms & Complexity</span>
              <button
                type="button"
                className="live-demo__code-tag"
                onClick={copyRoomCode}
                title="Copy room code"
                aria-label="Copy room code DSA-7X92"
              >
                <span className="text-mono">DSA-7X92</span>
                {copiedCode ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>

            <div className="live-demo__banner-right">
              <div className="live-demo__co-learners">
                <Users2 size={14} className="text-accent" />
                <span className="text-caption font-semibold">{participantCount} Co-learners Active</span>
              </div>
            </div>
          </div>

          {/* Living 3-Column Synergy Showcase */}
          <div className="live-demo__grid">
            {/* Column 1: Live Notes Co-editing */}
            <div className="live-demo__col live-demo__col--notes">
              <div className="live-demo__col-header">
                <div className="live-demo__col-title">
                  <FileText size={15} className="text-accent" />
                  <span className="text-label">Live Shared Notes</span>
                </div>
                {isTyping && (
                  <span className="live-demo__typing-pill text-caption">
                    <span className="live-demo__typing-dot" />
                    {typingUser} typing…
                  </span>
                )}
              </div>

              <div className="live-demo__notes-preview">
                <h3 className="live-demo__notes-h3">Binary Search Trees & Rebalancing</h3>
                <p className="live-demo__notes-p text-body-sm">
                  The binary search tree order invariant guarantees:
                </p>
                <div className="live-demo__code-snippet text-mono">
                  <code>{`T(n) = 2T(n/2) + O(1)  // Height: O(log n)`}</code>
                </div>

                <div className="live-demo__cursor-box">
                  <div className="live-demo__cursor-line" />
                  <span className="live-demo__cursor-badge">{typingUser}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Synchronized Focus Sprint */}
            <div className="live-demo__col live-demo__col--focus">
              <div className="live-demo__col-header">
                <div className="live-demo__col-title">
                  <Timer size={15} className="text-accent" />
                  <span className="text-label">Synced Focus Sprint</span>
                </div>
                <span className="text-caption text-tertiary">Group Locked</span>
              </div>

              <div className="live-demo__timer-display">
                <div className="live-demo__timer-ring">
                  <span className="live-demo__timer-clock text-mono">{formatTimer(secondsLeft)}</span>
                  <span className="live-demo__timer-label text-caption">Focus Sprint</span>
                </div>
                <div className="live-demo__timer-footer">
                  <Sparkles size={13} className="text-accent" />
                  <span className="text-caption">Goal: Chapter 4 Traversal</span>
                </div>
              </div>
            </div>

            {/* Column 3: Live Discussion Stream */}
            <div className="live-demo__col live-demo__col--chat">
              <div className="live-demo__col-header">
                <div className="live-demo__col-title">
                  <MessageSquare size={15} className="text-accent" />
                  <span className="text-label">Room Discussion</span>
                </div>
                <span className="text-caption text-tertiary">Real-time</span>
              </div>

              <div className="live-demo__chat-list">
                {messages.map((m) => (
                  <div key={m.id} className="live-demo__chat-bubble">
                    <div className="live-demo__chat-meta">
                      <span className="live-demo__chat-sender" style={{ color: m.color }}>{m.name}</span>
                      {m.role && <Badge variant="host">Host</Badge>}
                      <span className="live-demo__chat-time">{m.time}</span>
                    </div>
                    <p className="live-demo__chat-text text-body-sm">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
