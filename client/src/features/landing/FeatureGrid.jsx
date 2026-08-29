import { MessageSquare, FileText, PenLine, Timer, CheckSquare, HelpCircle } from 'lucide-react';
import './FeatureGrid.css';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description: 'Talk to your group without switching tabs. Messages land instantly.',
  },
  {
    icon: FileText,
    title: 'Shared Notes',
    description: 'One document, everyone typing. What you write, they see.',
  },
  {
    icon: PenLine,
    title: 'Whiteboard',
    description: 'Draw diagrams, sketch proofs, or just think out loud together.',
  },
  {
    icon: Timer,
    title: 'Focus Sessions',
    description: 'Start a timer everyone runs together. Stay on task, in sync.',
  },
  {
    icon: CheckSquare,
    title: 'Study Goals',
    description: 'A shared checklist. Agree on what you\'re covering before you start.',
  },
  {
    icon: HelpCircle,
    title: 'Quiz Mode',
    description: 'Host a quick quiz at the end of a session. Results, ranked.',
  },
];

export function FeatureGrid() {
  return (
    <section className="feature-grid" aria-label="Features">
      <h2 className="feature-grid__heading text-heading-md">Everything you need to study together</h2>
      <div className="feature-grid__grid" role="list">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="feature-grid__card" role="listitem">
            <div className="feature-grid__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <h3 className="feature-grid__title text-body-md" style={{ fontWeight: 600 }}>{title}</h3>
            <p className="feature-grid__desc text-body-sm">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
