import { useState } from 'react';
import { Pen, Eraser, RotateCcw, Trash2, Check, X } from 'lucide-react';
import { GlassPanel } from '../../../components/GlassPanel';
import './WhiteboardToolbar.css';

/**
 * @param {{
 *   tool: 'pen'|'eraser',
 *   setTool: (t: string) => void,
 *   color: string,
 *   setColor: (c: string) => void,
 *   size: 'S'|'M'|'L',
 *   setSize: (s: string) => void,
 *   onUndo: () => void,
 *   onClear: () => void,
 *   isLight?: boolean,
 * }} props
 */
export function WhiteboardToolbar({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  onUndo,
  onClear,
  isLight = false,
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const palette = [
    '#E8A33D', // Accent warm amber
    isLight ? '#1A1D20' : '#F5F3EF', // Text contrast
    '#6FBF8B', // Soft green
    '#5B8FBF', // Soft blue
    '#E06C63', // Soft red
  ];

  return (
    <GlassPanel className="whiteboard-toolbar">
      {/* Tools */}
      <div className="wb-tool-group">
        <button
          type="button"
          className={`wb-btn ${tool === 'pen' ? 'wb-btn--active' : ''}`}
          onClick={() => setTool('pen')}
          title="Pen tool"
          aria-label="Pen tool"
        >
          <Pen size={16} />
        </button>
        <button
          type="button"
          className={`wb-btn ${tool === 'eraser' ? 'wb-btn--active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser tool"
          aria-label="Eraser tool"
        >
          <Eraser size={16} />
        </button>
      </div>

      <div className="wb-divider" />

      {/* Stroke Sizes */}
      <div className="wb-tool-group">
        {(['S', 'M', 'L']).map((s) => (
          <button
            key={s}
            type="button"
            className={`wb-btn wb-btn--dot ${size === s ? 'wb-btn--active' : ''}`}
            onClick={() => setSize(s)}
            title={`Stroke Size ${s}`}
            aria-label={`Stroke Size ${s}`}
          >
            <span className={`wb-dot wb-dot--${s.toLowerCase()}`} />
          </button>
        ))}
      </div>

      <div className="wb-divider" />

      {/* Colors */}
      <div className="wb-tool-group">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className={`wb-color-swatch ${color === c && tool === 'pen' ? 'wb-color-swatch--selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => {
              setColor(c);
              setTool('pen');
            }}
            title={`Select color ${c}`}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <div className="wb-divider" />

      {/* Actions */}
      <div className="wb-tool-group">
        <button
          type="button"
          className="wb-btn"
          onClick={onUndo}
          title="Undo last stroke"
          aria-label="Undo"
        >
          <RotateCcw size={16} />
        </button>

        {confirmingClear ? (
          <div className="wb-confirm-group" role="group" aria-label="Confirm clear board">
            <span className="wb-confirm-label">Clear?</span>
            <button
              type="button"
              className="wb-btn wb-btn--confirm-yes"
              onClick={() => { setConfirmingClear(false); onClear(); }}
              title="Yes, clear the board"
              aria-label="Yes, clear board"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--confirm-no"
              onClick={() => setConfirmingClear(false)}
              title="Cancel"
              aria-label="Cancel clear"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="wb-btn wb-btn--danger"
            onClick={() => setConfirmingClear(true)}
            title="Clear Board"
            aria-label="Clear board"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </GlassPanel>
  );
}
