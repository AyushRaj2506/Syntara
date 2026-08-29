import './HowItWorks.css';

const STEPS = [
  { num: '01', title: 'Create a room', desc: 'Pick a subject, set a duration, and get a shareable room code in under 10 seconds.' },
  { num: '02', title: 'Share the code', desc: 'Send the code to your study group. They paste it in, hit join, and they\'re in.' },
  { num: '03', title: 'Study together', desc: 'Notes, whiteboard, chat, and a focus timer — everything runs live, in sync, for everyone in the room.' },
];

export function HowItWorks() {
  return (
    <section className="how-it-works" aria-label="How it works">
      <div className="how-it-works__inner">
        <h2 className="how-it-works__heading text-heading-md">Simple by design</h2>
        <ol className="how-it-works__steps">
          {STEPS.map(({ num, title, desc }) => (
            <li key={num} className="how-it-works__step">
              <span className="how-it-works__num text-display-lg" aria-hidden="true">{num}</span>
              <div className="how-it-works__text">
                <h3 className="text-body-lg" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h3>
                <p className="text-body-md" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
