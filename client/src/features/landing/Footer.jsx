import { ArrowRight } from 'lucide-react';
import { BrandMark } from './BrandMark';
import './Footer.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Footer({ onCreateRoom }) {
  return (
    <>
      {/* Final CTA */}
      <section className="final-cta" aria-label="Get started">
        <div className="final-cta__inner">
          <p className="text-body-md" style={{ color: 'var(--color-text-secondary)' }}>
            No sign-up. No download. Just a code and a room.
          </p>
          <button className="final-cta__btn" onClick={onCreateRoom} id="footer-create-room">
            Create a Room
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <BrandMark size={20} />
            <span className="text-label" style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
              SYNTARA
            </span>
          </div>
          <p className="site-footer__tagline text-caption">Learn together. Focus together.</p>
        </div>
      </footer>
    </>
  );
}
