# Architecture and choices

## Product flow

1. **Tonight:** **Start listening** requests microphone permission and starts native capture. The recording view shows elapsed capture time, a live sound indication, and **Stop & see summary**.
2. **Morning:** stopping yields a locally stored summary with score, detected snoring versus recorded time, quality reasons, and playback of the loudest ten seconds when available.
3. **My week:** one bar per morning shows the latest recording ending on that local date. A missing recording differs from a recorded night that did not count. Selecting a day shows its details, and **Open morning card** opens its full card.

Sample mode is identified in the interface. Fixture records use `source: 'demo'`, have no audio file URI, and never enter native history. A browser cannot establish that phone recording or background inference works.

The interface exposes the most recent session for each morning. Earlier sessions ending on the same date remain in native storage but have no separate history list in this version; deleting the latest reveals the previous one for that day.

## Native boundary

The UI calls the local `WellMSnore` Expo module through `src/services/engine.ts`. Its API is `requestMicrophonePermission`, `startNight`, `stopNight`, `getState`, `getNights`, `deleteNight`, and `deleteAllNights`. Timestamps are Unix milliseconds; durations are seconds. Typed records are in `src/domain/types.ts`.

Audio capture and inference live outside React renders and JavaScript timers. This matters because the operating system can suspend the JavaScript interface while the phone is locked. The UI polls native state while visible and refreshes after returning to the foreground. Native capture remains responsible for its own lifecycle.

Android uses a microphone foreground service and an ongoing recording notification. iOS uses an audio recording session with the audio background mode. Both paths need physical-device checks for permissions, interruptions, and lock-screen behavior. Starting while the app is foregrounded is part of the intended flow; arbitrary background starts and automatic restarts after a force-stop are not assumed.

## Inference and scoring

```text
Microphone PCM → mono 16 kHz → 15,600-sample windows → on-device YAMNet
                                                             ↓
                                   noise precedence → seconds counters → score + quality

Microphone PCM → bounded ten-second ring → maximum rolling RMS → local WAV clip
```

Windows do not overlap at the application level, so each sample contributes to at most one classification window. The final partial window remains captured time but is not included in analyzed time. This difference is exposed through the coverage check. Google's [YAMNet description](https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/README.md) specifies 16 kHz mono audio and the minimum 975 ms input needed for one prediction.

| Decision            | Rule                                                                         | Reason                                                              |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Detected snoring    | Snoring confidence ≥ 0.35, with no noisy label                               | An explicit, explainable prototype threshold                        |
| Noisy window        | Speech/Music/Television confidence ≥ 0.35, or clipped sample fraction > 0.01 | Competing sounds can make the estimate unreliable                   |
| Score               | `round(100 × snoringSeconds / analyzedSeconds)`, bounded 0–100               | Measures detected audio burden without presenting a sleep diagnosis |
| Too short           | Captured duration < 1,800 seconds                                            | Excludes short demonstrations from the weekly comparison            |
| Too noisy           | Noisy/analyzed > 0.30                                                        | Limits comparison when competing sounds dominate                    |
| Incomplete analysis | Analyzed/captured < 0.90                                                     | Excludes missing or failed analysis                                 |
| Interrupted         | Any recorded interruption                                                    | A stopped audio path should not masquerade as a continuous night    |

These values are product rules, not clinically validated cutoffs. A noisy window cannot count as snoring even when the model gives both classes a high score. Noisy time remains in the denominator, which can reduce the estimate in a busy room. Check the per-night quality notes alongside the number.

## Clip, storage, and privacy

A bounded ring holds the current ten seconds of PCM; a second bounded buffer holds the loudest candidate. The selection compares mean squared signal energy over the rolling window. This is the loudest captured sound, not necessarily the strongest snoring event. The engine keeps counters and a small waveform rather than collecting the entire night in memory.

Night metadata and the selected WAV clip stay in app-local storage, excluded from operating-system backups. Android uses its no-backup files directory and disables backup in the generated manifest; iOS excludes the directory and files from backup and applies file protection compatible with recording after the first device unlock. Up to 90 sessions are retained, with older metadata and clips pruned. The engine checkpoints active summaries so that an interrupted recording can be recovered as excluded history instead of being silently presented as a completed night. Deletion should remove the corresponding clip as well as the summary. Device testing must verify the precise lifecycle, including restart, retention, backup configuration, and deletion.

No runtime model download, remote inference, analytics service, account, or server is needed for a night. A development build can contact its local Metro server for code; that is different from audio processing, and airplane-mode privacy testing should use an installed build with an embedded JavaScript bundle.

## Limits to explain in an interview

- YAMNet is a general sound classifier, not a validated snore detector for a particular phone. Fans, speech, bedding movement, and another person's snoring can affect its output.
- The phone cannot identify whose snoring it hears, establish whether the user is asleep, measure airflow or oxygen, or diagnose sleep apnea.
- Confidence scores are model outputs, not the probability that a person has a condition. The 0.35 threshold needs representative clip evaluation.
- dBFS is a relative digital level. Device microphone gain and placement prevent reliable room-loudness comparisons.
- The loudest clip can contain sensitive household sound. Keeping only a short clip limits retention, but the user must still understand and control local storage.
- Foreground services and background audio are operating-system mechanisms, not a guarantee across OEM battery policies, calls, route changes, low battery, and force-stops.

## Verification boundaries

Pure TypeScript tests establish calculation and calendar behavior. Static checks establish TypeScript consistency and lint correctness. Host inference checks the bundled model's loading and output shape; native source and core clip tests check the code within available platform tooling. These checks do not prove that TensorFlow Lite loads on a target phone or that the microphone remains active for thirty locked-screen minutes. Follow `device-testing.md` and update `verification.md` with actual build versions, device details, timestamps, and observations.
