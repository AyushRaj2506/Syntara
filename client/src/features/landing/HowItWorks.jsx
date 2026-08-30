import { Laptop2, Key, Users2, ArrowRight } from 'lucide-react';
import './HowItWorks.css';

const STEPS = [
  {
    num: '01',
    phase: 'CREATE',
    icon: Laptop2,
    title: 'Initialize Room',
    desc: 'Pick your subject and room name. Generate an ephemeral, secure session in seconds.',
    tag: 'Instant Setup'
  },
  {
    num: '02',
    phase: 'INVITE',
    icon: Key,
    title: 'Share Room Code',
    desc: 'Pass your alphanumeric code to study buddies or peers. One-click instant access.',
    tag: 'Zero Friction'
  },
  {
    num: '03',
    phase: 'COLLABORATE',
    icon: Users2,
    title: 'Focus in Sync',
    desc: 'Co-edit live notes, sketch proofs on the board, run synced Pomodoro sprints, and quiz together.',
    tag: 'Live Sync',
    isPrimary: true
  },
];

export function HowItWorks() {
  return (
    <section className="how-it-works" aria-label="How Syntara works">
      <div className="container-fluid">
        {/* Section Header */}
        <div className="how-it-works__header">
          <span className="text-label text-accent">Workflow</span>
          <h2 className="text-display-lg how-it-works__title">
            Simple, frictionless collaboration
          </h2>
          <p className="text-body-md how-it-works__subtitle">
            No registration barriers. No installations. Three steps to synchronized group focus.
          </p>
        </div>

        {/* Process Flow Container */}
        <div className="workflow-flow">
          {STEPS.map(({ num, phase, icon: Icon, title, desc, tag, isPrimary }, index) => (
            <div key={num} className="workflow-step-wrapper">
              <div className={`workflow-card ${isPrimary ? 'workflow-card--featured' : ''}`}>
                {/* Step Top Meta */}
                <div className="workflow-card__top">
                  <div className="workflow-card__num-wrap">
                    <span className="workflow-card__num text-mono">{num}</span>
                    <span className="workflow-card__phase text-label">{phase}</span>
                  </div>
                  <div className="workflow-card__icon-node">
                    <Icon size={16} className="workflow-card__icon" />
                  </div>
                </div>

                {/* Step Content */}
                <div className="workflow-card__body">
                  <h3 className="workflow-card__title text-heading-lg">{title}</h3>
                  <p className="workflow-card__desc text-body-sm">{desc}</p>
                </div>

                {/* Step Footer */}
                <div className="workflow-card__footer">
                  <span className="workflow-card__tag text-caption">{tag}</span>
                  {isPrimary && (
                    <span className="workflow-card__live-badge text-caption font-semibold">
                      <span className="workflow-card__live-dot" />
                      Ready to Study
                    </span>
                  )}
                </div>
              </div>

              {/* Sequential Connector Line (Between 01->02 and 02->03) */}
              {index < STEPS.length - 1 && (
                <div className="workflow-connector" aria-hidden="true">
                  <div className="workflow-connector__line" />
                  <div className="workflow-connector__arrow">
                    <ArrowRight size={14} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
