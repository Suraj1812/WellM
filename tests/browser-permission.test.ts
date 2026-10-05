import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForMicrophone } from '../src/services/browserPermission';

test('ignored permission times out and every track from a late grant is released', async () => {
  let grant!: (stream: MediaStream) => void;
  const request = new Promise<MediaStream>((resolve) => {
    grant = resolve;
  });
  await assert.rejects(
    waitForMicrophone(request, 5),
    /permission timed out.*Start listening again/,
  );
  const stopped: string[] = [];
  grant({
    getTracks: () => [{ stop: () => stopped.push('audio') }, { stop: () => stopped.push('other') }],
  } as unknown as MediaStream);
  await Promise.resolve();
  assert.deepEqual(stopped, ['audio', 'other']);
});

test('a successful retry is retained even if an earlier timed-out grant arrives later', async () => {
  let oldGrant!: (stream: MediaStream) => void;
  const oldRequest = new Promise<MediaStream>((resolve) => {
    oldGrant = resolve;
  });
  await assert.rejects(waitForMicrophone(oldRequest, 5), /timed out/);
  let retryStopped = false;
  let oldStopped = false;
  const retry = {
    getTracks: () => [
      {
        stop: () => {
          retryStopped = true;
        },
      },
    ],
  } as unknown as MediaStream;
  assert.equal(await waitForMicrophone(Promise.resolve(retry), 50), retry);
  oldGrant({
    getTracks: () => [
      {
        stop: () => {
          oldStopped = true;
        },
      },
    ],
  } as unknown as MediaStream);
  await Promise.resolve();
  assert.equal(oldStopped, true);
  assert.equal(retryStopped, false);
});

test('permission denial rejects immediately without waiting for the timeout', async () => {
  const denied = new DOMException('Permission denied', 'NotAllowedError');
  await assert.rejects(waitForMicrophone(Promise.reject(denied), 50), (error) => error === denied);
});
