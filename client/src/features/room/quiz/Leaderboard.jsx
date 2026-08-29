import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import './Quiz.css';

/**
 * @param {{
 *   leaderboard: { participantId: string, displayName: string, score: number }[],
 *   onClose?: () => void,
 * }} props
 */
export function Leaderboard({ leaderboard = [] }) {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 0: return <Trophy size={18} className="text-accent" />;
      case 1: return <Medal size={18} style={{ color: '#C0C0C0' }} />;
      case 2: return <Award size={18} style={{ color: '#CD7F32' }} />;
      default: return <span className="text-caption font-bold text-tertiary">#{rank + 1}</span>;
    }
  };

  return (
    <div className="quiz-leaderboard">
      <div className="quiz-leaderboard__header">
        <Trophy size={32} className="text-accent" />
        <h2 className="text-display-md" style={{ color: 'var(--color-text-primary)' }}>
          Quiz Complete!
        </h2>
        <p className="text-body-md text-secondary">
          Final leaderboard rankings
        </p>
      </div>

      <div className="quiz-leaderboard__list">
        {leaderboard.map((entry, idx) => (
          <div
            key={entry.participantId}
            className={`leaderboard-row ${idx === 0 ? 'leaderboard-row--winner' : ''}`}
          >
            <div className="leaderboard-row__rank">
              {getRankIcon(idx)}
            </div>
            <Avatar name={entry.displayName} participantId={entry.participantId} size="sm" />
            <span className="leaderboard-row__name text-body-md font-medium">
              {entry.displayName}
            </span>
            <span className="leaderboard-row__score text-heading-md font-bold text-accent">
              {entry.score} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
