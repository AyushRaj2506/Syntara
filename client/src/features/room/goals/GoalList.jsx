import { useState, useRef } from 'react';
import { Check, Plus, Trash2, CheckSquare } from 'lucide-react';
import './GoalList.css';

/**
 * @param {{
 *   goals: object[],
 *   meId: string,
 *   hostId: string,
 *   actions: object,
 * }} props
 */
export function GoalList({ goals = [], meId, hostId, actions }) {
  const [newGoalText, setNewGoalText] = useState('');
  const inputRef = useRef(null);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newGoalText.trim();
    if (!trimmed) return;
    actions.createGoal(trimmed);
    setNewGoalText('');
  };

  const isHost = meId === hostId;

  return (
    <div className="goal-list">
      <div className="goal-list__header">
        <span className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>Study Goals</span>
        <span className="text-caption text-tertiary">
          {goals.filter((g) => g.completed).length}/{goals.length}
        </span>
      </div>

      {/* Checklist items */}
      <div className="goal-list__items" role="list">
        {goals.length === 0 ? (
          <div className="goal-list__empty">
            <CheckSquare size={20} className="text-tertiary" />
            <p className="text-body-sm text-tertiary">No goals yet. Add the first one.</p>
          </div>
        ) : (
          goals.map((goal) => {
            const canDelete = goal.createdBy === meId || isHost;
            return (
              <div
                key={goal.goalId}
                className={`goal-item ${goal.completed ? 'goal-item--completed' : ''}`}
                role="listitem"
              >
                <button
                  className={`goal-checkbox ${goal.completed ? 'goal-checkbox--checked' : ''}`}
                  onClick={() => actions.toggleGoal(goal.goalId, !goal.completed)}
                  aria-label={goal.completed ? `Mark "${goal.text}" incomplete` : `Mark "${goal.text}" complete`}
                >
                  {goal.completed && <Check size={12} strokeWidth={2.5} />}
                </button>

                <span
                  className="goal-item__text text-body-sm"
                  onClick={() => actions.toggleGoal(goal.goalId, !goal.completed)}
                >
                  {goal.text}
                </span>

                {canDelete && (
                  <button
                    className="goal-item__delete"
                    onClick={() => actions.deleteGoal(goal.goalId)}
                    title="Delete goal"
                    aria-label={`Delete goal: ${goal.text}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Goal Input */}
      <form className="goal-list__form" onSubmit={handleAdd}>
        <input
          ref={inputRef}
          type="text"
          className="goal-list__input"
          placeholder="Add a study goal…"
          value={newGoalText}
          maxLength={200}
          onChange={(e) => setNewGoalText(e.target.value)}
          aria-label="New study goal"
        />
        <button
          type="submit"
          className="goal-list__add-btn"
          disabled={!newGoalText.trim()}
          aria-label="Add goal"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
