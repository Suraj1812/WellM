/** Browsers may leave a permission request pending indefinitely when it is ignored. */
export function waitForMicrophone(
  request: Promise<MediaStream>,
  timeoutMs = 30_000,
): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(
        new Error(
          'Microphone permission timed out. Choose Allow in the browser permission prompt, then tap Start listening again.',
        ),
      );
    }, timeoutMs);
    request.then(
      (stream) => {
        clearTimeout(timer);
        if (expired) {
          // getUserMedia cannot be cancelled. A late grant must not orphan capture
          // or replace a stream belonging to the user's next recording attempt.
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        resolve(stream);
      },
      (error) => {
        clearTimeout(timer);
        if (!expired) reject(error);
      },
    );
  });
}
