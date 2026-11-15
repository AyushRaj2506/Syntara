// Compiler Explorer executes binaries in its remote sandbox; never on this host.
async function executeCpp(code, request = fetch) {
  const response = await request('https://godbolt.org/api/compiler/g132/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ source: code, lang: 'c++', allowStoreCodeDebug: false,
      options: { userArguments: '-std=c++20', compilerOptions: { executorRequest: true }, filters: { execute: true } } }),
  });
  if (!response.ok) throw new Error(`Compiler service returned ${response.status}`);
  const result = await response.json();
  if (typeof result.code !== 'number' || (!result.didExecute && !result.buildResult && !result.stderr?.length)) {
    throw new Error('Compiler returned an incomplete result');
  }
  const lines = values => (values || []).map(line => line.text || '').join('\n');
  return {
    stdout: lines(result.stdout),
    stderr: [lines(result.buildResult?.stderr), lines(result.stderr)].filter(Boolean).join('\n'),
    exitCode: result.buildResult?.code || result.code,
  };
}
module.exports = { executeCpp };
