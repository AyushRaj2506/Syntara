/**
 * Pyodide Web Worker for sandboxed Python execution.
 * Loads Pyodide from CDN on first use, then runs Python code in isolation.
 * This worker runs in a separate thread with no access to the DOM.
 */

let pyodide = null;
let pyodideLoading = null;

async function loadPyodideIfNeeded() {
  if (pyodide) return pyodide;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });
    return pyodide;
  })();

  return pyodideLoading;
}

self.onmessage = async (e) => {
  const { code, id } = e.data;

  try {
    const py = await loadPyodideIfNeeded();

    // Redirect stdout/stderr to capture output
    let stdout = '';
    let stderr = '';

    py.setStdout({ batched: (s) => { stdout += s + '\n'; } });
    py.setStderr({ batched: (s) => { stderr += s + '\n'; } });

    try {
      await py.runPythonAsync(code);
      self.postMessage({ id, stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode: 0 });
    } catch (err) {
      self.postMessage({ id, stdout: stdout.trimEnd(), stderr: err.message, exitCode: 1 });
    }
  } catch (err) {
    self.postMessage({ id, error: `Failed to load Python runtime: ${err.message}` });
  }
};
