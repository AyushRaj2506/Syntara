const { test } = require('node:test');
const assert = require('node:assert/strict');
const { executeCpp } = require('../src/services/cppExecution');
test('C++ execution returns runtime output and the program exit code', async () => {
  const result = await executeCpp('int main(){}', async (_url, options) => {
    assert.equal(JSON.parse(options.body).allowStoreCodeDebug, false);
    return { ok: true, json: async () => ({ code: 2, didExecute: true, stdout: [{ text: '42' }], stderr: [], buildResult: { code: 0 } }) };
  });
  assert.deepEqual(result, { stdout: '42', stderr: '', exitCode: 2 });
});
test('C++ compilation errors are surfaced without reporting success', async () => {
  const result = await executeCpp('invalid', async () => ({ ok: true, json: async () => ({ code: -1, didExecute: false, buildResult: { code: 1, stderr: [{ text: 'syntax error' }] } }) }));
  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, 'syntax error');
});
test('C++ service failures trigger fallback rather than an empty successful output', async () => {
  await assert.rejects(executeCpp('test', async () => ({ ok: false, status: 503 })), /503/);
  await assert.rejects(executeCpp('test', async () => ({ ok: true, json: async () => ({}) })), /incomplete/);
});
