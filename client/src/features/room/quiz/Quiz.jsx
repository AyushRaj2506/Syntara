import { useState, useEffect } from 'react';
import { HelpCircle, Check, X } from 'lucide-react';
import { QuizCreator } from './QuizCreator';
import { Leaderboard } from './Leaderboard';
import './Quiz.css';

/**
 * @param {{
 *   quizState: object|null,
 *   meId: string,
 *   isHost: boolean,
 *   actions: object,
 *   participants: object[],
 * }} props
 */
export function Quiz({ quizState, meId: _meId, isHost, actions, participants: _participants }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const status = quizState?.status;
  const currentIndex = quizState?.currentIndex ?? 0;
  const questions = quizState?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const results = quizState?._results;
  const leaderboard = quizState?._leaderboard;

  // Reset local option on question change
  useEffect(() => {
    setSelectedOption(null);
  }, [currentIndex]);

  // Question timer countdown
  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !quizState?.questionEndsAt) return;

    const update = () => {
      const remainingMs = Math.max(0, quizState.questionEndsAt - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [status, quizState?.questionEndsAt]);

  const handleSelectOption = (optIdx) => {
    if (selectedOption !== null || results) return; // Locked once answered or revealed
    setSelectedOption(optIdx);
    actions.submitQuizAnswer(currentIndex, optIdx);
  };

  // 1. NOT STARTED STATE
  if (!quizState || status === undefined) {
    if (isHost) {
      return (
        <div className="quiz-takeover">
          <QuizCreator onStart={(qs) => actions.startQuiz(qs)} />
        </div>
      );
    }
    return (
      <div className="quiz-takeover quiz-empty-state">
        <HelpCircle size={32} className="text-accent" />
        <h3 className="text-heading-md">No quiz active</h3>
        <p className="text-body-md text-secondary">
          The host can start a live quiz anytime during the study session.
        </p>
      </div>
    );
  }

  // 2. COMPLETED STATE -> LEADERBOARD
  if (status === 'COMPLETED' || leaderboard) {
    return (
      <div className="quiz-takeover">
        <Leaderboard leaderboard={leaderboard || []} />
      </div>
    );
  }

  // 3. IN PROGRESS QUESTION VIEW
  if (!currentQuestion) return null;

  const totalTime = currentQuestion.timerSec || 20;
  const progressPct = Math.min(100, Math.max(0, (timeLeft / totalTime) * 100));

  return (
    <div className="quiz-takeover quiz-live">
      {/* Top Bar: Progress & Counter */}
      <div className="quiz-live__top">
        <div className="quiz-live__meta">
          <span className="text-label text-accent">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-caption font-bold text-secondary">
            {timeLeft}s remaining
          </span>
        </div>
        <div className="quiz-live__progress-track">
          <div
            className="quiz-live__progress-bar"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="quiz-live__question">
        <h2 className="text-heading-lg" style={{ color: 'var(--color-text-primary)' }}>
          {currentQuestion.text}
        </h2>
      </div>

      {/* 4 Answer Options */}
      <div className="quiz-live__options-grid">
        {currentQuestion.options.map((opt, idx) => {
          const isChosen = selectedOption === idx;
          const isRevealed = results !== undefined && results !== null;
          const isCorrect = isRevealed && results.correctIndex === idx;
          const isWrongChosen = isRevealed && isChosen && !isCorrect;

          let cardClass = 'quiz-opt-card';
          if (isChosen && !isRevealed) cardClass += ' quiz-opt-card--selected';
          if (isCorrect) cardClass += ' quiz-opt-card--correct';
          if (isWrongChosen) cardClass += ' quiz-opt-card--wrong';

          return (
            <button
              key={idx}
              className={cardClass}
              onClick={() => handleSelectOption(idx)}
              disabled={selectedOption !== null || isRevealed}
            >
              <span className="quiz-opt-letter">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="quiz-opt-text text-body-lg font-medium">{opt}</span>

              {isCorrect && <Check size={20} className="quiz-opt-icon text-success" />}
              {isWrongChosen && <X size={20} className="quiz-opt-icon text-danger" />}
            </button>
          );
        })}
      </div>

      {/* Status Footer */}
      <div className="quiz-live__footer">
        {results ? (
          <span className="text-body-sm text-accent">
            Revealing answer… Next question coming up!
          </span>
        ) : selectedOption !== null ? (
          <span className="text-body-sm text-secondary">
            Answer submitted. Waiting for timer or other participants…
          </span>
        ) : (
          <span className="text-body-sm text-tertiary">
            Select an answer to submit.
          </span>
        )}
      </div>
    </div>
  );
}
