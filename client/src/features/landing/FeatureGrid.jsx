import { useState } from 'react';
import {
  MessageSquare,
  FileText,
  PenTool,
  Timer,
  CheckSquare2,
  HelpCircle,
  Zap
} from 'lucide-react';
import './FeatureGrid.css';

export function FeatureGrid() {
  const [goalChecked, setGoalChecked] = useState([true, true, false]);
  const [selectedAnswer, setSelectedAnswer] = useState(1);

  const toggleGoal = (index) => {
    setGoalChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <section className="features-section" aria-label="Syntara Core Capabilities">
      <div className="container-fluid">
        {/* Section Header */}
        <div className="features-section__header">
          <div className="features-section__tag">
            <Zap size={13} className="text-accent" />
            <span className="text-label">Core Capabilities</span>
          </div>
          <h2 className="text-display-lg features-section__title">
            Engineered for focused group study
          </h2>
          <p className="text-body-md features-section__subtitle">
            Six synchronized tools built directly into every room. No tab switching, zero friction.
          </p>
        </div>

        {/* Fluid 3-Column Grid */}
        <div className="capabilities-grid">
          {/* 1. Real-time Chat */}
          <div className="capability-card capability-card--chat">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <MessageSquare size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Real-time</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Live Group Chat</h3>
              <p className="capability-card__desc text-body-sm">
                Instant messaging alongside your study workspace. Drop inline code blocks and share lecture files.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--chat">
              <div className="mini-chat-bubble">
                <span className="mini-chat-sender" style={{ color: '#5B8FBF' }}>Alex Vance</span>
                <p className="mini-chat-text">Reviewing the Dijkstra shortest path proof.</p>
              </div>
              <div className="mini-typing-indicator">
                <span className="mini-typing-dot" />
                <span className="text-caption">Priya is typing…</span>
              </div>
            </div>
          </div>

          {/* 2. Shared Notes */}
          <div className="capability-card capability-card--notes">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <FileText size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Co-Editing</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Shared Notes</h3>
              <p className="capability-card__desc text-body-sm">
                Simultaneous multi-cursor markdown editing with real-time sync for everyone in the room.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--notes">
              <div className="mini-notes-line mini-notes-line--title"># Recurrence Relations</div>
              <div className="mini-notes-line">T(n) = 2T(n/2) + O(n)</div>
              <div className="mini-notes-tag text-mono">Master Theorem → O(n log n)</div>
            </div>
          </div>

          {/* 3. Whiteboard */}
          <div className="capability-card capability-card--board">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <PenTool size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Infinite Canvas</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Shared Whiteboard</h3>
              <p className="capability-card__desc text-body-sm">
                Sketch data structure diagrams, math proofs, and system architectures in real-time.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--board">
              <svg viewBox="0 0 180 70" className="mini-sketch-svg">
                <circle cx="40" cy="35" r="14" stroke="var(--color-accent)" strokeWidth="2" fill="none" />
                <text x="40" y="39" textAnchor="middle" fill="var(--color-text-primary)" fontSize="9">Root</text>
                <line x1="52" y1="42" x2="74" y2="52" stroke="var(--color-border-strong)" strokeWidth="1.5" />
                <circle cx="86" cy="54" r="11" stroke="var(--color-success)" strokeWidth="1.5" fill="none" />
                <text x="86" y="57" textAnchor="middle" fill="var(--color-text-primary)" fontSize="8">R</text>
                <line x1="28" y1="42" x2="16" y2="52" stroke="var(--color-border-strong)" strokeWidth="1.5" />
                <circle cx="12" cy="54" r="11" stroke="var(--color-info)" strokeWidth="1.5" fill="none" />
                <text x="12" y="57" textAnchor="middle" fill="var(--color-text-primary)" fontSize="8">L</text>
              </svg>
            </div>
          </div>

          {/* 4. Focus Sessions */}
          <div className="capability-card capability-card--focus">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <Timer size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Pomodoro</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Focus Sprints</h3>
              <p className="capability-card__desc text-body-sm">
                Coordinated sprint intervals. When the timer starts, the entire group locks in together.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--focus">
              <div className="mini-timer-dial">
                <span className="mini-timer-digits text-mono">25:00</span>
                <span className="mini-timer-badge text-caption">Active Sprint</span>
              </div>
            </div>
          </div>

          {/* 5. Study Goals */}
          <div className="capability-card capability-card--goals">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <CheckSquare2 size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Accountability</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Study Goals</h3>
              <p className="capability-card__desc text-body-sm">
                Shared checklist for the session. Check off objectives together as you cover concepts.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--goals">
              {[
                'Chapter 4 Tree Traversal',
                'Implement QuickSelect Algorithm',
                'Practice Quiz Arena'
              ].map((text, idx) => (
                <button
                  key={text}
                  type="button"
                  className={`mini-goal-row ${goalChecked[idx] ? 'mini-goal-row--checked' : ''}`}
                  onClick={() => toggleGoal(idx)}
                >
                  <div className={`mini-goal-checkbox ${goalChecked[idx] ? 'mini-goal-checkbox--checked' : ''}`}>
                    {goalChecked[idx] && <span>✓</span>}
                  </div>
                  <span className="mini-goal-text">{text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Quiz Mode */}
          <div className="capability-card capability-card--quiz">
            <div className="capability-card__header">
              <div className="capability-card__icon-box">
                <HelpCircle size={18} className="text-accent" />
              </div>
              <span className="text-label text-accent">Review Arena</span>
            </div>
            <div className="capability-card__body">
              <h3 className="capability-card__title text-heading-lg">Quiz Arena</h3>
              <p className="capability-card__desc text-body-sm">
                Host lightning-round quizzes at session wrap-up with instant scored leaderboards.
              </p>
            </div>
            {/* Mini Demo */}
            <div className="capability-card__demo capability-card__demo--quiz">
              <div className="mini-quiz-q text-caption font-semibold">Q: Height of balanced AVL tree with N nodes?</div>
              <div className="mini-quiz-opts">
                {['O(N)', 'O(log N)', 'O(1)'].map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    className={`mini-quiz-opt ${selectedAnswer === i ? 'mini-quiz-opt--selected' : ''}`}
                    onClick={() => setSelectedAnswer(i)}
                  >
                    <span className="mini-quiz-idx">{String.fromCharCode(65 + i)}</span>
                    <span>{opt}</span>
                    {i === 1 && <span className="mini-quiz-correct">✓ 100%</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
