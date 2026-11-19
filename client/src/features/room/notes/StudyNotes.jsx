import { ToolbarMore } from '../../../components/ToolbarMore';
import { useCollaborativeDocument } from '../../../hooks/useCollaborativeDocument';
import Collaboration from '@tiptap/extension-collaboration';
import { SyncStatus } from '../../../components/SyncStatus';
import { useEffect, useState } from 'react';
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
  FileText,
} from 'lucide-react';
import { socket } from '../../../lib/socket';
import './StudyNotes.css';

/**
 * @param {{
 *   initialContent: string,
 *   actions: object,
 * }} props
 */
export function StudyNotes({ actions }) {
  const collaboration = useCollaborativeDocument('notes', actions.roomCode);
  return <div className="study-notes">
    <SyncStatus document={collaboration} />
    {collaboration.ready ? <NotesEditor actions={actions} doc={collaboration.doc} /> : <p role="status">Joining shared notes…</p>}
  </div>;
}
function NotesEditor({ actions, doc }) {
  const [editingUsers, setEditingUsers] = useState({});
  const [confirmingClear, setConfirmingClear] = useState(false);

  const editor = useEditor({
    extensions: [
      Collaboration.configure({ document: doc }),
      StarterKit.configure({
        undoRedo: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start building your shared notes. Everything you write here is synced with everyone in the room…',
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'notes-editor-content',
      },
    },
    onUpdate: () => {
      actions.pingEditing?.();
    },
  });

  useEffect(() => {
    const presence = ({ participantId }) => setEditingUsers(prev => ({ ...prev, [participantId]: Date.now() }));
    socket.on('notes:editing', presence);
    return () => socket.off('notes:editing', presence);
  }, []);

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

  const handleClearNotes = () => editor?.commands.clearContent();

  const hasEditors = Object.keys(editingUsers).length > 0;
  const isEditorEmpty = editor ? editor.isEmpty : true;

  if (!editor) return null;

  return (
    <div className="study-notes" style={{ minHeight: 0, flex: 1 }}>
      {/* Toolbar */}
      <div className="study-notes__toolbar" role="toolbar" aria-label="Notes formatting toolbar">

        <div className="study-notes__tool-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
            aria-label="Code"
          >
            <Code size={15} />
          </button>
        </div>

        <div className="study-notes__tool-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            aria-label="Undo"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            aria-label="Redo"
          >
            <RotateCw size={15} />
          </button>

        </div>
        <ToolbarMore>
          <div className="study-notes__tool-group">
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              aria-label="Heading 1"
            >
              <Heading1 size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              aria-label="Heading 2"
            >
              <Heading2 size={15} />
            </button>
          </div>

          <div className="study-notes__tool-group">
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
              aria-label="Bullet list"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
              aria-label="Numbered list"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
              aria-label="Quote"
            >
              <Quote size={15} />
            </button>
          </div>

            {confirmingClear ? (
              <div className="notes-confirm-group" role="group" aria-label="Confirm clear notes">
                <span className="notes-confirm-label text-caption">Clear notes?</span>
                <button
                  type="button"
                  className="toolbar-btn toolbar-btn--confirm-yes"
                  onClick={() => {
                    setConfirmingClear(false);
                    handleClearNotes();
                  }}
                  title="Yes, clear all notes"
                  aria-label="Yes, clear notes"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn toolbar-btn--confirm-no"
                  onClick={() => setConfirmingClear(false)}
                  title="Cancel"
                  aria-label="Cancel clear"
                >
                  <X size={13} />
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
                <Trash2 size={15} />
              </button>
            )}
        </ToolbarMore>
        {hasEditors && (
          <div className="study-notes__presence text-caption text-accent" aria-live="polite">
            <span className="presence-dot" /> Co-editing active
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="study-notes__editor-wrapper">
        <EditorContent editor={editor} />

        {isEditorEmpty && (
          <div className="notes-empty-hero" aria-hidden="true">
            <FileText size={28} className="text-tertiary notes-empty-hero__icon" />
            <div className="notes-empty-hero__text">
              <h4 className="text-body-md font-semibold text-primary">Start building your shared notes</h4>
              <p className="text-caption text-tertiary">
                Everything you write here is synchronized live with everyone in the room.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
