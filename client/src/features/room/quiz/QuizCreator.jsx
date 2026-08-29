import { useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import './Quiz.css';

/**
 * @param {{
 *   onStart: (questions: object[]) => void,
 * }} props
 */
export function QuizCreator({ onStart }) {
  const [questions, setQuestions] = useState([
    {
      questionId: crypto.randomUUID(),
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      timerSec: 20,
    },
  ]);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions((prev) => [
      ...prev,
      {
        questionId: crypto.randomUUID(),
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        timerSec: 20,
      },
    ]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx, text) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx].text = text;
      return next;
    });
  };

  const updateOption = (qIdx, optIdx, val) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIdx].options];
      opts[optIdx] = val;
      next[qIdx].options = opts;
      return next;
    });
  };

  const setCorrectIndex = (qIdx, correctIdx) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIdx].correctIndex = correctIdx;
      return next;
    });
  };

  const updateTimer = (qIdx, sec) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIdx].timerSec = Number(sec);
      return next;
    });
  };

  const isValid = questions.every(
    (q) => q.text.trim() && q.options.every((opt) => opt.trim())
  );

  const handleStart = () => {
    if (!isValid) return;
    onStart(questions);
  };

  return (
    <div className="quiz-creator">
      <div className="quiz-creator__header">
        <div>
          <h2 className="text-heading-lg">Create a Quiz</h2>
          <p className="text-body-sm text-secondary">
            Set up questions for the room. Participants will answer in real time.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleStart}
          disabled={!isValid}
        >
          <Play size={16} fill="currentColor" /> Start Quiz
        </Button>
      </div>

      <div className="quiz-creator__list">
        {questions.map((q, qIdx) => (
          <div key={q.questionId} className="quiz-card">
            <div className="quiz-card__header">
              <span className="text-label text-accent">Question {qIdx + 1} of {questions.length}</span>
              <div className="quiz-card__header-actions">
                <label className="quiz-timer-select">
                  <span className="text-caption text-secondary">Timer:</span>
                  <select
                    value={q.timerSec}
                    onChange={(e) => updateTimer(qIdx, e.target.value)}
                    className="quiz-timer-dropdown"
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </label>
                {questions.length > 1 && (
                  <button
                    className="quiz-del-btn"
                    onClick={() => removeQuestion(qIdx)}
                    title="Remove question"
                    aria-label="Remove question"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <Input
              placeholder="e.g. What is the time complexity of searching in a balanced BST?"
              value={q.text}
              onChange={(e) => updateQuestionText(qIdx, e.target.value)}
              className="quiz-question-input"
            />

            <div className="quiz-options-grid">
              {q.options.map((opt, optIdx) => {
                const isCorrect = q.correctIndex === optIdx;
                return (
                  <div
                    key={optIdx}
                    className={`quiz-option-input-wrap ${isCorrect ? 'quiz-option-input-wrap--correct' : ''}`}
                  >
                    <button
                      type="button"
                      className={`quiz-correct-radio ${isCorrect ? 'quiz-correct-radio--selected' : ''}`}
                      onClick={() => setCorrectIndex(qIdx, optIdx)}
                      title="Mark as correct answer"
                      aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </button>
                    <input
                      type="text"
                      className="quiz-option-input"
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      value={opt}
                      onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {questions.length < 10 && (
        <Button
          variant="secondary"
          onClick={addQuestion}
          className="quiz-add-q-btn"
        >
          <Plus size={16} /> Add Question ({questions.length}/10)
        </Button>
      )}
    </div>
  );
}
