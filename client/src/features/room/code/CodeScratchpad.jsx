import { ToolbarMore } from '../../../components/ToolbarMore';
import { useCollaborativeDocument } from '../../../hooks/useCollaborativeDocument';
import * as Y from 'yjs';
import { useToast } from '../../../hooks/useToast';
import { SyncStatus } from '../../../components/SyncStatus';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Check, Trash2, Code2, Play, Loader2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { memberHeaders, SERVER_URL } from '../../../lib/socket';
import './CodeScratchpad.css';

const DEFAULT_SNIPPETS = {
  python: `# Python 3 Study Scratchpad
def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

# Example test
data = [2, 4, 7, 10, 13, 18, 29]
print("Index of 10:", binary_search(data, 10))
`,
  cpp: `// C++ Study Scratchpad
#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> data = {2, 4, 7, 10, 13, 18, 29};
    cout << "Index of 10: " << binarySearch(data, 10) << endl;
    return 0;
}
`,
};

let pyodideWorker = null;
const pyodideWorkerCallbacks = new Map();

function getPyodideWorker() {
  if (pyodideWorker) return pyodideWorker;
  pyodideWorker = new Worker('/pyodide-worker.js');
  pyodideWorker.onmessage = (e) => {
    const { id, ...result } = e.data;
    const cb = pyodideWorkerCallbacks.get(id);
    if (cb) {
      pyodideWorkerCallbacks.delete(id);
      cb.resolve(result);
    }
  };
  pyodideWorker.onerror = (e) => {
    for (const [, cb] of pyodideWorkerCallbacks) {
      cb.resolve({ error: `Worker error: ${e.message}` });
    }
    pyodideWorkerCallbacks.clear();
    pyodideWorker = null;
  };
  return pyodideWorker;
}

function runPython(code, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      pyodideWorker?.terminate();
      pyodideWorker = null;
      for (const cb of pyodideWorkerCallbacks.values()) cb.resolve({ error: 'Execution timed out; runtime restarted.' });
      pyodideWorkerCallbacks.clear();
    }, timeoutMs);

    pyodideWorkerCallbacks.set(id, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
    });

    try {
      getPyodideWorker().postMessage({ id, code });
    } catch (error) {
      clearTimeout(timer);
      pyodideWorkerCallbacks.delete(id);
      resolve({ error: error.message });
    }
  });
}

async function runCpp(code, roomCode) {
  try {
    const res = await fetch(`${SERVER_URL}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...memberHeaders(roomCode) },
      body: JSON.stringify({ code, language: 'cpp' }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'C++ execution failed.' };
    return { stdout: data.stdout, stderr: data.stderr, exitCode: data.exitCode };
  } catch {
    return {
      error:
        'C++ execution requires a sandboxed compiler services that are currently unavailable.\n\n' +
        'Python runs in your browser after its runtime downloads. Switch to Python to run code.',
    };
  }
}

/**
 * @param {{
 *   initialCodeState?: { code: string, language: string },
 *   actions: object,
 * }} props
 */
export function CodeScratchpad({ actions }) {
  const collaboration = useCollaborativeDocument('code', actions.roomCode);
  return <div className="code-scratchpad">
    <SyncStatus document={collaboration} />
    {collaboration.ready ? <CodeEditor actions={actions} doc={collaboration.doc} /> : <p role="status">Joining shared code…</p>}
  </div>;
}
function CodeEditor({ actions, doc }) {
  const [value, setValue] = useState(() => ({ code: doc.getText('code').toString(), language: doc.getMap('settings').get('language') || 'python' }));
  const { code, language } = value;
  const selection = useRef(null);
  const [undoManager] = useState(() => new Y.UndoManager(doc.getText('code'), { trackedOrigins: new Set(['local']) }));
  useEffect(() => {
    const text = doc.getText('code');
    const before = transaction => {
      selection.current = null;
      const input = textareaRef.current;
      if (transaction.origin === 'remote' && input === window.document.activeElement) {
        selection.current = [Y.createRelativePositionFromTypeIndex(text, input.selectionStart), Y.createRelativePositionFromTypeIndex(text, input.selectionEnd)];
      }
    };
    const update = () => {
      const nextCode = text.toString();
      const input = textareaRef.current;
      // Apply each remote transaction immediately, before the next transaction
      // captures cursor anchors. React may batch several state updates together.
      if (input && input.value !== nextCode) input.value = nextCode;
      if (input && selection.current) {
        const [start, end] = selection.current.map(position => Y.createAbsolutePositionFromRelativePosition(position, doc)?.index);
        if (start !== undefined && end !== undefined) input.setSelectionRange(start, end);
        selection.current = null;
      }
      setValue({ code: nextCode, language: doc.getMap('settings').get('language') || 'python' });
    };
    doc.on('beforeTransaction', before); doc.on('afterTransaction', update);
    return () => { doc.off('beforeTransaction', before); doc.off('afterTransaction', update); };
  }, [doc]);
  const change = ({ code: next, language: nextLanguage }) => {
    const text = doc.getText('code');
    const previous = text.toString();
    let start = 0, suffix = 0;
    while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
    while (suffix < previous.length - start && suffix < next.length - start && previous[previous.length - suffix - 1] === next[next.length - suffix - 1]) suffix++;
    doc.transact(() => {
      const removed = previous.length - start - suffix;
      if (removed) text.delete(start, removed);
      const added = next.slice(start, next.length - suffix);
      if (added) text.insert(start, added);
      if (doc.getMap('settings').get('language') !== nextLanguage) doc.getMap('settings').set('language', nextLanguage);
    }, 'local');
  };
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [outputOpen, setOutputOpen] = useState(false);

  const textareaRef = useRef(null);
  const handleCodeChange = (e) => change({ code: e.target.value, language });
  const handleLanguageChange = (e) => {
    const nextLanguage = e.target.value;
    change({ code: code || DEFAULT_SNIPPETS[nextLanguage], language: nextLanguage });
    setOutput(null);
  };
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      if (e.key.toLowerCase() === 'y' || e.shiftKey) undoManager.redo(); else undoManager.undo();
      return;
    }
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const start = e.target.selectionStart;
    const next = e.target.value.slice(0, start) + '    ' + e.target.value.slice(e.target.selectionEnd);
    if (next.length > e.target.maxLength) return;
    change({ code: next, language });
    e.target.setSelectionRange(start + 4, start + 4);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ message: 'Clipboard unavailable. Select the code and copy it manually.', type: 'error' });
    }
  };

  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClear = () => {
    change({ code: '', language });
    setOutput(null);
    setConfirmingClear(false);
  };

  const handleRun = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setOutput({ error: 'Nothing to run — editor is empty.' });
      setOutputOpen(true);
      return;
    }

    setRunning(true);
    setOutput(null);
    setOutputOpen(true);

    let result;
    if (language === 'python') {
      result = await runPython(code);
    } else {
      result = await runCpp(code, actions.roomCode);
    }

    setOutput(result);
    setRunning(false);
  }, [code, language, actions.roomCode]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const hasOutput = output !== null;
  const outputHasError = hasOutput && (output.error || (output.exitCode !== 0 && output.exitCode !== undefined));

  return (
    <div className="code-scratchpad" style={{ minHeight: 0, flex: 1 }}>
      {/* Header bar */}
      <div className="code-scratchpad__toolbar">
        <div className="code-scratchpad__toolbar-left">
          <div className="code-scratchpad__lang-select-wrap">
            <Code2 size={15} className="text-accent" />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="code-scratchpad__lang-select"
              aria-label="Programming Language"
            >
              <option value="python">Python 3</option>
              <option value="cpp">C++ (20)</option>
            </select>
          </div>
          <span className="text-caption text-tertiary">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {code.length} chars
          </span>
          <span className="code-runtime-badge text-caption">
            {language === 'python' ? '⚡ Pyodide' : '⚡ GCC 13 (C++20)'}
          </span>
        </div>

        <div className="code-scratchpad__toolbar-right">
          {/* Run button — Primary Action */}
          <button
            type="button"
            className="code-action-btn code-action-btn--run"
            onClick={handleRun}
            disabled={running}
            title={
              language === 'python'
                ? 'Run Python 3 (Pyodide WebAssembly in browser)'
                : 'Run C++ (GCC 13.2.0 with C++20 standard)'
            }
            aria-label={running ? 'Running…' : 'Run code'}
          >
            {running ? <Loader2 size={13} className="code-spinner" /> : <Play size={13} fill="currentColor" />}
            <span>{running ? 'Running…' : 'Run'}</span>
          </button>

          <ToolbarMore>
            <button
              type="button"
              className="code-action-btn"
              onClick={handleCopy}
              title="Copy code to clipboard"
              aria-label={copied ? 'Copied code' : 'Copy code'}
            >
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {confirmingClear ? (
              <div className="code-confirm-group" role="group" aria-label="Confirm clear code">
                <span className="code-confirm-label text-caption">Clear?</span>
                <button
                  type="button"
                  className="code-action-btn code-action-btn--confirm-yes"
                  onClick={handleClear}
                  title="Yes, clear all code"
                  aria-label="Yes, clear code"
                >
                  <Check size={12} className="text-success" />
                </button>
                <button
                  type="button"
                  className="code-action-btn"
                  onClick={() => setConfirmingClear(false)}
                  title="Cancel"
                  aria-label="Cancel clear"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="code-action-btn code-action-btn--danger"
                onClick={() => setConfirmingClear(true)}
                title="Clear code"
                aria-label="Clear code"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </ToolbarMore>
        </div>
      </div>

      {/* Editor area with line numbers */}
      <div className="code-scratchpad__editor">
        <div className="code-scratchpad__lines" aria-hidden="true">
          {lineNumbers.map((num) => (
            <span key={num} className="code-line-number">
              {num}
            </span>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-scratchpad__textarea"
          maxLength={100000}
          defaultValue={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          placeholder="// Type or paste your code here…"
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Code editor"
        />
      </div>

      {/* Output panel */}
      {hasOutput && (
        <div className={`code-output ${outputHasError ? 'code-output--error' : 'code-output--success'}`}>
          <button
            type="button"
            className="code-output__header"
            onClick={() => setOutputOpen((v) => !v)}
            aria-expanded={outputOpen}
          >
            <span className="code-output__header-left">
              <Terminal size={13} />
              <span className="text-label">
                {output.error ? 'Error' : `Output (exit ${output.exitCode ?? 0})`}
              </span>
            </span>
            {outputOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {outputOpen && (
            <div className="code-output__body" role="log" aria-live="polite" aria-label="Code output">
              {output.error ? (
                <pre className="code-output__pre code-output__pre--err">{output.error}</pre>
              ) : (
                <>
                  {output.stdout && <pre className="code-output__pre">{output.stdout}</pre>}
                  {output.stderr && (
                    <pre className="code-output__pre code-output__pre--err">{output.stderr}</pre>
                  )}
                  {!output.stdout && !output.stderr && (
                    <pre className="code-output__pre code-output__pre--empty">{'(no output)'}</pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
