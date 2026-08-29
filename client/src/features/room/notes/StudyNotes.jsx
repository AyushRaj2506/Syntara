import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  RotateCcw,
  RotateCw,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { socket } from '../../../lib/socket';
import './StudyNotes.css';

/**
 * @param {{
 *   initialContent: string,
 *   actions: object,
 * }} props
 */
export function StudyNotes({ initialContent, actions }) {
  const [editingUsers, setEditingUsers] = useState({});
  const [confirmingClear, setConfirmingClear] = useState(false);
  const isLocalUpdateRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const presencePingTimerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your notes together…',
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'notes-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      isLocalUpdateRef.current = true;
      const html = editor.getHTML();

      // Throttled presence ping (1 every 2s)
      if (!presencePingTimerRef.current) {
        actions.pingEditing?.();
        presencePingTimerRef.current = setTimeout(() => {
          presencePingTimerRef.current = null;
        }, 2000);
      }

      // Debounced broadcast (350ms)
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        actions.updateNotes?.(html);
        isLocalUpdateRef.current = false;
      }, 350);
    },
  });

  // Listen for remote note updates and clear events
  useEffect(() => {
    const handleRemoteUpdate = ({ content }) => {
      if (isLocalUpdateRef.current) return;
      if (editor && content !== editor.getHTML()) {
        const { from, to } = editor.state.selection;
        editor.commands.setContent(content, false);
        try {
          editor.commands.setTextSelection({ from, to });
        } catch {
          // ignore bounds mismatch
        }
      }
    };

    const handleRemoteClear = () => {
      if (editor) {
        isLocalUpdateRef.current = false;
        editor.commands.clearContent(true);
      }
    };

    const handleEditingPresence = ({ participantId }) => {
      setEditingUsers((prev) => ({
        ...prev,
        [participantId]: Date.now(),
      }));
    };

    socket.on('notes:update', handleRemoteUpdate);
    socket.on('notes:clear', handleRemoteClear);
    socket.on('notes:editing', handleEditingPresence);

    return () => {
      socket.off('notes:update', handleRemoteUpdate);
      socket.off('notes:clear', handleRemoteClear);
      socket.off('notes:editing', handleEditingPresence);
      clearTimeout(debounceTimerRef.current);
      clearTimeout(presencePingTimerRef.current);
    };
  }, [editor, actions]);

  // Clean stale presence pings every 1.5s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEditingUsers((prev) => {
        let changed = false;
        const next = {};
        for (const [id, time] of Object.entries(prev)) {
          if (now - time < 3500) {
            next[id] = time;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Clear — called AFTER inline confirmation; no window.confirm needed.
  const handleClearNotes = () => {
    if (editor) {
      clearTimeout(debounceTimerRef.current);
      isLocalUpdateRef.current = true;
      editor.commands.clearContent(true);
      setTimeout(() => { isLocalUpdateRef.current = false; }, 400);
    }
    actions.clearNotes?.();
  };

  const hasEditors = Object.keys(editingUsers).length > 0;

  if (!editor) return null;

  return (
    <div className="study-notes">
      {/* Toolbar */}
      <div className="study-notes__toolbar" role="toolbar" aria-label="Notes formatting toolbar">
        <div className="study-notes__tool-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 size={16} />
          </button>
        </div>

        <div className="study-notes__divider" />

        <div className="study-notes__tool-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
            aria-label="Code"
          >
            <Code size={16} />
          </button>
        </div>

        <div className="study-notes__divider" />

        <div className="study-notes__tool-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            aria-label="Bullet list"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            aria-label="Numbered list"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
            aria-label="Quote"
          >
            <Quote size={16} />
          </button>
        </div>

        <div className="study-notes__divider" />

          <div className="study-notes__tool-group">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
              aria-label="Undo"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
              aria-label="Redo"
            >
              <RotateCw size={16} />
            </button>

            {confirmingClear ? (
              <div className="notes-confirm-group" role="group" aria-label="Confirm clear notes">
                <span className="notes-confirm-label">Clear notes?</span>
                <button
                  type="button"
                  className="toolbar-btn toolbar-btn--confirm-yes"
                  onClick={() => { setConfirmingClear(false); handleClearNotes(); }}
                  title="Yes, clear all notes"
                  aria-label="Yes, clear notes"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn toolbar-btn--confirm-no"
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
                className="toolbar-btn toolbar-btn--danger"
                onClick={() => setConfirmingClear(true)}
                title="Clear all shared notes"
                aria-label="Clear all notes"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

        {hasEditors && (
          <div className="study-notes__presence text-caption text-accent" aria-live="polite">
            <span className="presence-dot" /> Someone is editing…
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="study-notes__editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
