import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureLocalRuntime, type RuntimeLoadCache } from '../src/services/browserRuntime';

test('a runtime already loaded before Fast Refresh is reused instead of loaded twice', async () => {
  const runtime = { ready: true };
  const existing = Promise.resolve(runtime);
  let attempts = 0;
  const result = await ensureLocalRuntime(
    () => existing,
    () => {
      attempts++;
      throw new Error('LiteRT is already loading / loaded.');
    },
    {},
  );
  assert.equal(result, runtime);
  assert.equal(attempts, 0);
});

test('an existing loading promise waits for readiness without duplicate initialization', async () => {
  let complete!: (runtime: string) => void;
  const existing = new Promise<string>((resolve) => {
    complete = resolve;
  });
  const result = ensureLocalRuntime(
    () => existing,
    () => {
      throw new Error('duplicate load');
    },
    {},
  );
  complete('ready');
  assert.equal(await result, 'ready');
});

test('concurrent callers share a pending load across loader re-creation', async () => {
  const cache: RuntimeLoadCache<string> = {};
  let complete!: (runtime: string) => void;
  let attempts = 0;
  const load = () => {
    attempts++;
    return new Promise<string>((resolve) => {
      complete = resolve;
    });
  };
  const first = ensureLocalRuntime(() => undefined, load, cache);
  const second = ensureLocalRuntime(() => undefined, load, cache);
  assert.equal(first, second);
  complete('ready');
  assert.deepEqual(await Promise.all([first, second]), ['ready', 'ready']);
  assert.equal(attempts, 1);
  assert.equal(cache.pending, undefined);
});

test('a failed load clears the shared pending promise and a retry can succeed', async () => {
  const cache: RuntimeLoadCache<string> = {};
  await assert.rejects(
    ensureLocalRuntime(
      () => undefined,
      () => Promise.reject(new Error('WASM fetch failed')),
      cache,
    ),
    /WASM fetch failed/,
  );
  assert.equal(cache.pending, undefined);
  assert.equal(
    await ensureLocalRuntime(
      () => undefined,
      () => Promise.resolve('ready'),
      cache,
    ),
    'ready',
  );
});

test('a runtime registered during initialization is adopted after the duplicate guard', async () => {
  let existing: Promise<string> | undefined;
  assert.equal(
    await ensureLocalRuntime(
      () => existing,
      () => {
        existing = Promise.resolve('ready');
        throw new Error('LiteRT is already loading / loaded.');
      },
      {},
    ),
    'ready',
  );
});
