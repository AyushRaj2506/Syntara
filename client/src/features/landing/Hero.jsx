import { ArrowRight, Shield, Users, Zap } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Button } from '../../components/Button';
import './Hero.css';

/** @param {{ onCreateRoom: () => void }} props */
export function Hero({ onCreateRoom }) {
  return (
    <section className="hero" aria-label="Syntara Hero">
      {/* Atmospheric Ambient Orbit Background */}
      <div className="hero__ambient-bg" aria-hidden="true">
        <div className="hero__ambient-glow" />
        <div className="hero__orbit-art">
          <BrandMark size={520} opacity={0.06} animated className="hero__orbit-svg" />
        </div>
      </div>

      <div className="hero__container">
        {/* Live Status Eyebrow */}
        <div className="hero__eyebrow-wrap">
          <div className="hero__status-pill">
            <span className="hero__status-dot" />
            <span className="hero__status-text">Ephemeral Collaboration Space</span>
            <span className="hero__status-badge">No Sign-up</span>
          </div>
        </div>

        {/* Editorial Headline with Staggered Entrance & Safe Descender Clearance */}
        <h1 className="hero__headline text-display-2xl">
          <span className="hero__headline-line hero__headline-line--1">Learn together.</span>
          <span className="hero__headline-line hero__headline-line--2">
            Focus in <span className="hero__headline-accent">sync.</span>
          </span>
        </h1>

        {/* Subtext */}
        <p className="hero__subtext text-body-lg">
          Spin up a shared study room in seconds. Bring your group, sync your notes,
          sketch on a shared whiteboard, and lock into synchronized focus sprints.
        </p>

        {/* Single Dominant Primary Action */}
        <div className="hero__action-wrap">
          <Button
            size="md"
            onClick={onCreateRoom}
            id="hero-create-room"
            className="hero__cta-btn"
          >
            <span>Create a Room</span>
            <ArrowRight size={16} className="hero__cta-arrow" aria-hidden="true" />
          </Button>

          <p className="hero__trust-line text-caption">
            No signup · No download · Free to use
          </p>
        </div>

        {/* Reassurance Trust Strip */}
        <div className="hero__trust-strip">
          <div className="hero__trust-item">
            <Zap size={14} className="hero__trust-icon" />
            <span className="text-caption">Instant Real-time Sync</span>
          </div>
          <div className="hero__trust-dot" />
          <div className="hero__trust-item">
            <Shield size={14} className="hero__trust-icon" />
            <span className="text-caption">Zero-Retention Privacy</span>
          </div>
          <div className="hero__trust-dot" />
          <div className="hero__trust-item">
            <Users size={14} className="hero__trust-icon" />
            <span className="text-caption">Up to 50 Co-learners</span>
          </div>
        </div>
      </div>
    </section>
  );
}
