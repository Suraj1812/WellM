# Physical-phone acceptance protocol

This protocol provides the evidence required by the take-home. It has not been completed just by adding the native source. Record results, device model, OS, build revision, and clip provenance in `verification.md`.

## Prepare

1. Install a native build on a real Android phone or iPhone; Expo Go and web sample mode are insufficient.
2. Obtain a reusable snoring clip you are allowed to play. Record its source and license; do not bundle someone else's audio without permission.
3. Play it from a **second device**, positioned about 0.5–1 m from the test phone at a comfortable volume. Keep both volumes and positions fixed during comparisons.
4. Find a quiet room. Charge the test phone, uncover its microphone, and allow microphone permission. On Android, confirm the ongoing capture notification appears.
5. Exit sample mode. Confirm the selected morning card is a real recording before showing its result in the submission video.

## Thirty-minute screen-locked run

1. Note the wall-clock time and battery percentage. Start a night while WellM is foregrounded.
2. Confirm elapsed capture time starts increasing, then lock the screen. Leave it locked for **at least 31 minutes** so the test clears the 30-minute threshold.
3. Use a repeatable pattern: several minutes quiet, several minutes of snoring playback, then quiet again. Record the approximate playback periods independently.
4. Unlock without first restarting the app. Observe whether elapsed captured time and analyzed time include the locked interval.
5. Stop, inspect the result, and note score, captured seconds, analyzed seconds, snoring seconds, noisy seconds, quality reasons, and clip length.
6. Play the loudest clip. It should be real captured audio with the expected sound. Longer recordings should produce a ten-second clip.
7. Confirm the week shows the night on the local morning date and that its count status agrees with its quality metrics.
8. Reopen the app. Verify the night and playback remain available. Record any battery-management warning or interruption; do not hide a failed run.

**Pass criteria:** at least 1,800 captured seconds while the screen was locked for at least thirty minutes, at least 90% analysis coverage, no interruption, at most 30% noisy analyzed sound, a readable morning card, and usable playback. A score need not equal the external clip's play-time percentage because confidence thresholds and capture conditions affect classification. Investigate unexpectedly zero detection before submitting.

## Edge cases

| Case                                                  | Expected observation                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Microphone denied                                     | Start is blocked with a clear recovery message; no false active session                             |
| Short, quiet capture                                  | Morning card saved; Week says it did not count because it was under thirty minutes                  |
| Speech/music playing for most of a ≥30-minute capture | High noisy fraction; Week gives the noise reason                                                    |
| Sound much too loud near the microphone               | Clipped input contributes to noisy windows; do not label clipping as calibrated room volume         |
| Incoming call or another app taking the microphone    | Interruption is surfaced and the night is excluded rather than treated as continuous                |
| App UI goes to the background                         | Native capture continues; returning to the app refreshes its current state                          |
| App is force-stopped or process is terminated         | No claim of continued recording; reopening recovers an interrupted summary when a checkpoint exists |
| Two captures end on the same local date               | The week selects the latest; deleting it reveals the previous retained session for that day         |
| Delete one night                                      | Summary and its clip disappear; other nights remain                                                 |
| Delete all history                                    | Stored summaries and clips are removed; active recording must be stopped first                      |
| Airplane mode in a build with embedded JS             | Recording, inference, stop, history, and playback work without network access                       |
| Quiet room, fan, speech, music, snoring               | Compare detections to hand-noted source intervals and write down false positives/negatives          |

## Two-minute submission recording

Complete the long run first, then record the app on the **real phone**. Include a brief view of the second device playing the test clip or an accompanying camera view so the test setup is clear. The two-minute video is a concise demonstration; it cannot prove thirty minutes of capture on its own. Keep the separate long-run notes.

| Time      | Show and say                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Start night screen. Explain that sound and the model stay on the phone, and that this is an estimate rather than a medical assessment. |
| 0:15–0:35 | Tap Start, show microphone permission if needed, and show the second device playing snoring.                                           |
| 0:35–0:50 | Show active listening, lock and unlock once, and explain that the separate recorded acceptance run covered ≥30 locked-screen minutes.  |
| 0:50–1:10 | Stop the short demonstration. Show that its morning result is honestly marked too short.                                               |
| 1:10–1:35 | Open the completed ≥30-minute night, show score and snoring versus recorded minutes, and play its loudest ten seconds.                 |
| 1:35–1:55 | Week bars. Select a short or noisy night and show its exact exclusion reason.                                                          |
| 1:55–2:00 | Close by stating that a higher score means more detected snoring and the app does not diagnose anything.                               |

Do not show sample data as real device evidence. Replace the video draft and test-result placeholders with the actual artifact links before sending the application.
