import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Trash2, Code2, Play, Loader2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { socket, SERVER_URL } from '../../../lib/socket';
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
      pyodideWorkerCallbacks.delete(id);
      pyodideWorker?.terminate();
      pyodideWorker = null;
      resolve({ error: 'Execution timed out after 15 seconds.' });
    }, timeoutMs);

    pyodideWorkerCallbacks.set(id, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
    });

    getPyodideWorker().postMessage({ id, code });
  });
}

async function runCpp(code) {
  try {
    const res = await fetch(`${SERVER_URL}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: 'cpp' }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'C++ execution failed.' };
    return { stdout: data.stdout, stderr: data.stderr, exitCode: data.exitCode };
  } catch {
    return {
      error:
        'C++ execution requires a sandboxed compiler service that is currently unavailable.\n\n' +
        'Python (Pyodide WebAssembly) works fully offline. Switch to Python to run code.',
    };
  }
}

/**
 * @param {{
 *   initialCodeState?: { code: string, language: string },
 *   actions: object,
 * }} props
 */
export function CodeScratchpad({ initialCodeState, actions }) {
  const [language, setLanguage] = useState(() => initialCodeState?.language || 'python');
  const [code, setCode] = useState(
    () => initialCodeState?.code || DEFAULT_SNIPPETS[initialCodeState?.language || 'python']
  );
  const [copied, setCopied] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [outputOpen, setOutputOpen] = useState(false);

  const isLocalUpdateRef = useRef(false);
  const debounceRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (initialCodeState?.code && initialCodeState.code !== code && !isLocalUpdateRef.current) {
      setCode(initialCodeState.code);
      if (initialCodeState.language) setLanguage(initialCodeState.language);
    }
  }, [initialCodeState]); // eslint-disable-line

  // Socket listeners for remote code updates
  useEffect(() => {
    const handleRemoteUpdate = ({ code: remoteCode, language: remoteLang }) => {
      if (isLocalUpdateRef.current) return;
      if (remoteCode !== undefined) setCode(remoteCode);
      if (remoteLang) setLanguage(remoteLang);
    };

    const handleRemoteClear = () => {
      setCode('');
    };

    socket.on('code:update', handleRemoteUpdate);
    socket.on('code:clear', handleRemoteClear);

    return () => {
      socket.off('code:update', handleRemoteUpdate);
      socket.off('code:clear', handleRemoteClear);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    isLocalUpdateRef.current = true;
    setCode(newCode);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      actions.updateCode?.(newCode, language);
      isLocalUpdateRef.current = false;
    }, 300);
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (!code || code === DEFAULT_SNIPPETS[language]) {
      const template = DEFAULT_SNIPPETS[newLang] || '';
      setCode(template);
      actions.updateCode?.(template, newLang);
    } else {
      actions.updateCode?.(code, newLang);
    }
    setOutput(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const updated = val.substring(0, start) + '    ' + val.substring(end);
      setCode(updated);
      isLocalUpdateRef.current = true;

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      });

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        actions.updateCode?.(updated, language);
        isLocalUpdateRef.current = false;
      }, 300);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClear = () => {
    setCode('');
    setOutput(null);
    setConfirmingClear(false);
    actions.clearCode?.();
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
      result = await runPython(trimmed);
    } else {
      result = await runCpp(trimmed);
    }

    setOutput(result);
    setRunning(false);
  }, [code, language]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const hasOutput = output !== null;
  const outputHasError = hasOutput && (output.error || (output.exitCode !== 0 && output.exitCode !== undefined));

  return (
    <div className="code-scratchpad">
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
          value={code}
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
