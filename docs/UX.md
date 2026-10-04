# Twelve user-experience improvements

These changes are implemented in the interface, state, domain, and native code. Physical-device behavior still needs the evidence in `verification.md`; this list does not imply a completed microphone or thirty-minute locked-screen acceptance run.

1. **Accessible controls.** Shared buttons and icon actions carry readable accessibility labels, roles, and relevant disabled/selected state. Primary actions use at least 54 points of height to reduce precision demands when starting and stopping a night.
2. **Comfortable layouts.** Shared spacing and typography keep the three screens consistent. Safe-area spacing protects controls around phone insets, while constrained content widths keep the browser preview readable. Subtle browser reveals respect reduced-motion preferences and keep recording controls immediately available.
3. **Permission guidance.** Starting explains why microphone access is needed and that audio stays local. Denied access produces a recovery message instead of a recording state that never started.
4. **Capture owned by native code.** Audio capture and model inference do not depend on a running React render loop or a JavaScript timer. Native background mechanisms support the intended lock-screen flow, subject to device verification.
5. **Honest interruption recovery.** Native checkpoints preserve useful session metadata after an interruption. A recovered interruption has an exclusion reason instead of presenting itself as a continuous completed night.
6. **Visible counting reasons.** A short, noisy, incompletely analyzed, or interrupted recording stays available with specific quality reasons. Missing data and a recorded night that did not count have different states.
7. **Clearly separated sample mode.** The preview identifies sample records, stores no fabricated audio URI, and keeps them separate from native recorded history. It lets reviewers explore the interface before a phone build is ready.
8. **Playback with state.** The morning card plays the actual local loudest clip when available and shows a meaningful unavailable state otherwise. Playback is presented as captured sound rather than a guaranteed snoring event.
9. **Control over local history.** Users can delete individual nights or clear history, with recording-aware safeguards. Native retention and deletion cover the associated short clips as well as metadata; verify the file lifecycle on the phone.
10. **An understandable score.** The interface explains the direction of the score, the snoring-versus-recorded time, and why a night may be excluded. Nonmedical wording avoids implying sleep-quality measurement or diagnosis.
11. **Predictable action feedback.** Loading, busy, and error states make session actions legible. A single-operation guard prevents overlapping starts/stops, and returning to the app refreshes the native session state.
12. **Maintainable screen logic.** Thin Expo Router routes use shared components, a typed native bridge, and pure domain calculations. Tests cover the calculation boundaries, dates, and sample-data behavior so policy changes can be reviewed with evidence.
