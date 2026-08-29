import { useState, useEffect } from 'react';
import { Flame, CheckCircle, Clock } from 'lucide-react';
import { GlassPanel } from '../../components/GlassPanel';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import './ProductPreview.css';

const MOCK_MESSAGES = [
  { id: '1', name: 'Alex', color: '#5B8FBF', text: 'Just updated the binary search tree traversal section in notes.', time: '2m ago' },
  { id: '2', name: 'Priya', color: '#C0704A', text: 'Awesome, reviewing the deletion edge case now.', time: '1m ago' },
  { id: '3', name: 'Marcus', color: '#7B9E5A', text: 'Timer is set for 25m focus sprint. Let’s finish chapter 4.', time: 'Just now' },
];

const EXTRA_MESSAGES = [
  { id: '4', name: 'Priya', color: '#C0704A', text: 'Don’t forget the balance factor property for AVL trees!', time: 'Just now' },
  { id: '5', name: 'Alex', color: '#5B8FBF', text: 'Added a quick diagram to the board.', time: 'Just now' },
];

export function ProductPreview() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 + 38);

  // Timer ticking down in real time
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 25 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ambient chat messages fading in and typing indicator
  useEffect(() => {
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      if (msgIdx < EXTRA_MESSAGES.length) {
        const nextMsg = EXTRA_MESSAGES[msgIdx];
        setMessages((prev) => [...prev, nextMsg]);
        msgIdx++;
      } else {
        setMessages(MOCK_MESSAGES);
        msgIdx = 0;
      }
    }, 7000);

    const typingInterval = setInterval(() => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 4000);
    }, 12000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(typingInterval);
    };
  }, []);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section className="product-preview" aria-label="Live product preview">
      <div className="product-preview__container">
        <GlassPanel className="product-preview__mockup">
          {/* Header */}
          <div className="product-preview__header">
            <div className="product-preview__header-left">
              <div className="product-preview__traffic-dots">
                <span className="dot dot--red" />
                <span className="dot dot--yellow" />
                <span className="dot dot--green" />
              </div>
              <span className="product-preview__room-title text-heading-md">Algorithms & Data Structures</span>
              <span className="product-preview__badge text-caption">DSA-7X92</span>
            </div>
            <div className="product-preview__header-right">
              <span className="product-preview__status-pill text-caption">
                <span className="status-dot status-dot--live" /> 3 online
              </span>
              <span className="text-caption text-secondary">42m left</span>
            </div>
          </div>

          {/* Workspace Body */}
          <div className="product-preview__grid">
            {/* Left sidebar: Participants + Focus */}
            <div className="product-preview__col product-preview__col--sidebar">
              <div className="preview-section">
                <span className="text-label text-tertiary">Participants</span>
                <div className="preview-participants">
                  <div className="preview-participant-row">
                    <Avatar name="Alex Vance" participantId="alex-1" size="sm" />
                    <span className="text-body-sm preview-name">Alex Vance</span>
                    <Badge variant="host">Host</Badge>
                  </div>
                  <div className="preview-participant-row">
                    <Avatar name="Priya Sharma" participantId="priya-2" size="sm" />
                    <span className="text-body-sm preview-name">Priya Sharma</span>
                    <Flame size={12} className="text-accent" />
                  </div>
                  <div className="preview-participant-row">
                    <Avatar name="Marcus Chen" participantId="marcus-3" size="sm" />
                    <span className="text-body-sm preview-name">Marcus Chen</span>
                  </div>
                </div>
              </div>

              <div className="preview-section preview-timer-card">
                <div className="preview-timer-header">
                  <span className="text-label text-accent">Focus Sprint</span>
                  <span className="text-caption text-secondary">3 active</span>
                </div>
                <div className="preview-timer-digits text-display-md">
                  {formatTimer(secondsLeft)}
                </div>
                <div className="preview-progress-bar">
                  <div className="preview-progress-fill" style={{ width: '64%' }} />
                </div>
              </div>

              <div className="preview-section">
                <span className="text-label text-tertiary">Shared Goals</span>
                <div className="preview-goals">
                  <div className="preview-goal-item completed">
                    <CheckCircle size={14} className="text-success" />
                    <span className="text-body-sm">BST search and insertion</span>
                  </div>
                  <div className="preview-goal-item">
                    <div className="preview-checkbox" />
                    <span className="text-body-sm">AVL rotation cases</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Shared Notes */}
            <div className="product-preview__col product-preview__col--center">
              <div className="preview-notes-header">
                <span className="text-label text-tertiary">Shared Notes</span>
                {isTyping && (
                  <span className="preview-typing-indicator text-caption text-accent">
                    Priya is typing…
                  </span>
                )}
              </div>
              <div className="preview-notes-content">
                <h3 className="text-heading-md preview-notes-h">Binary Search Trees & Rebalancing</h3>
                <p className="text-body-md text-secondary">
                  A binary search tree satisfies the invariant: <code className="preview-code">left.val &lt; root.val &lt; right.val</code>.
                </p>
                <div className="preview-notes-callout">
                  <span className="text-caption text-accent font-medium">Key Observation:</span>
                  <p className="text-body-sm text-secondary">
                    Standard search takes <strong>O(h)</strong> time where h is the tree height. Balancing ensures <strong>h = O(log n)</strong>.
                  </p>
                </div>
                <ul className="preview-notes-list text-body-sm text-secondary">
                  <li>• Left-Left Case: Right Rotation on node z</li>
                  <li>• Right-Right Case: Left Rotation on node z</li>
                  <li>• Left-Right Case: Left on (z.left) then Right on z</li>
                </ul>
              </div>
            </div>

            {/* Right: Live Chat */}
            <div className="product-preview__col product-preview__col--chat">
              <div className="preview-chat-header">
                <span className="text-label text-tertiary">Room Chat</span>
              </div>
              <div className="preview-chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className="preview-chat-msg">
                    <div className="preview-chat-meta">
                      <span className="text-caption font-semibold" style={{ color: m.color }}>{m.name}</span>
                      <span className="text-caption text-tertiary">{m.time}</span>
                    </div>
                    <p className="text-body-sm text-primary">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="preview-chat-input">
                <span className="text-body-sm text-tertiary">Message the room…</span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
