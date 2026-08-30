import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Button } from '../../components/Button';
import './Footer.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Footer({ onCreateRoom }) {
  return (
    <>
      {/* Restrained Final CTA Card */}
      <section className="final-cta-section" aria-label="Get Started with Syntara">
        <div className="container-fluid">
          <div className="final-cta-card">
            <div className="final-cta-card__ambient" aria-hidden="true" />

            <div className="final-cta-card__content">
              <div className="final-cta-card__badge">
                <Sparkles size={14} className="text-accent" />
                <span className="text-label">Ready in 10 Seconds</span>
              </div>

              <h2 className="text-display-xl final-cta-card__title">
                Ready to get real study work done?
              </h2>

              <p className="text-body-lg final-cta-card__subtitle">
                No account creation. No downloads. Just a clean collaborative room with everything you need.
              </p>

              <div className="final-cta-card__actions">
                <Button
                  size="lg"
                  onClick={onCreateRoom}
                  id="footer-create-room"
                  className="final-cta-btn"
                >
                  <span>Create a Study Room</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>

              <div className="final-cta-card__reassurance">
                <div className="reassurance-pill">
                  <ShieldCheck size={14} className="text-success" />
                  <span>Zero Data Tracking</span>
                </div>
                <div className="reassurance-pill">
                  <Zap size={14} className="text-accent" />
                  <span>Instant WebSockets Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Refined Minimal Footer */}
      <footer className="site-footer">
        <div className="container-fluid">
          <div className="site-footer__inner">
            <div className="site-footer__brand-col">
              <a href="/" className="site-footer__brand" aria-label="Syntara home">
                <BrandMark size={20} interactive />
                <span className="site-footer__wordmark text-label">SYNTARA</span>
              </a>
              <p className="site-footer__tagline text-body-sm">
                Learn together. Focus in sync.
              </p>
            </div>

            <div className="site-footer__status-col">
              <div className="site-footer__beacon">
                <span className="beacon-dot" />
                <span className="text-caption">All Systems Operational</span>
              </div>
              <p className="site-footer__copyright text-caption">
                © {new Date().getFullYear()} Syntara. Ephemeral collaborative study rooms.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
