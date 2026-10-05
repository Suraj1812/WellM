# Verification log

Keep build-time checks and physical-device evidence separate. Update this file with actual results; do not change pending rows to passed without running the corresponding check.

## Automated checks

The first native build and CI results below describe the published 4 October preview. The 5 October browser checks and rebuilt Android preview are recorded in their own sections below.

| Check                              | Status                          | Evidence                                                                                                                          |
| ---------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Pure domain tests                  | Passed                          | `npm test`: 18 tests covering score, quality, calendar behavior, and sample data                                                  |
| TypeScript                         | Passed                          | `npm run typecheck`                                                                                                               |
| Lint                               | Passed                          | `npm run lint`                                                                                                                    |
| Formatting                         | Passed                          | `npm run format:check`                                                                                                            |
| Expo Doctor                        | Passed                          | 21 of 21 checks passed                                                                                                            |
| Native prebuild                    | Passed (Android)                | Android native project generation completed                                                                                       |
| Android source compilation         | Passed                          | `:wellm-snore:compileDebugKotlin` passed with actual Expo Modules Core and LiteRT dependencies                                    |
| Android clip tests                 | Passed                          | `:wellm-snore:testDebugUnitTest`: three tests, zero failures or errors                                                            |
| Bundled-model inference            | Passed on host                  | Silent-input inference returned 521 finite label scores; this verifies loading and shape, not snoring accuracy                    |
| iOS source and core checks         | Passed within available tooling | Swift parsing, Foundation core type checking, and 120 exhaustive rolling-RMS checks passed                                        |
| iOS resources and module discovery | Passed                          | CocoaPods resource mapping and Expo autolinking validated                                                                         |
| Full Android APK build             | Passed (arm64 preview)          | `:app:assembleRelease` passed; packaged model, embedded bundle, microphone service, signature, and 16 KB ZIP alignment verified   |
| Full iOS native build              | Pending                         | Requires a compatible Xcode/iOS toolchain and a complete native build                                                             |
| Browser UI and AOS                 | Passed                          | Start/stop preview, week/day navigation, deletion dialogs, 320–1440 px layouts, nested-scroll reveals and reduced motion verified |
| Web production export              | Passed                          | `npm run build:web`                                                                                                               |
| GitHub CI                          | Passed on GitHub                | [Run 37180554109](https://github.com/Suraj1812/WellM/actions/runs/37180554109) passed for `0e1d546`                               |

During implementation, `npm audit` reported 30 advisories in inherited toolchain dependencies. A compatible automatic fix was unavailable. The project retains SDK-compatible dependencies; review upstream maintainer updates instead of forcing an incompatible SDK downgrade.

## Android preview artifact

Published as [v1.0.0-preview](https://github.com/Suraj1812/WellM/releases/tag/v1.0.0-preview), with the APK, checksum, and three browser screenshots. The release download was verified to return HTTP 200 and the expected byte length.

Built on 4 October 2026. The local artifact is `artifacts/wellm-preview.apk`, 55,249,018 bytes, for `arm64-v8a` Android phones running Android 7 or newer. Package: `com.wellm.nights`, version `1.0.0`, minimum SDK 24, target SDK 36. The release variant is signed with the generated Android Debug certificate for sideloaded preview use; it needs a production signing key before store distribution.

APK SHA-256: `eb1be0b257cae52d1dc167095b2a1cb65871da3f6a10b3ef1be7edc5c83626a5`.

The APK contains a 2,369,620-byte embedded application bundle and the audited YAMNet model with SHA-256 `10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de`. Its merged manifest includes the non-exported microphone foreground service, recording and foreground microphone permissions, wake-lock permission, and `allowBackup=false` with `fullBackupContent=false`. `apksigner verify` and `zipalign -P 16 -c 4` passed. The native Gradle JUnit report contains three tests, zero failures, and zero errors.

The successful build used JDK 17, Gradle 9.3.1, SDK 36, Build Tools 35/36, NDK 27.1.12297006, and CMake 3.22.1. The isolated SDK remains at `/tmp/wellm-android-sdk` and the Gradle runtime at `/tmp/wellm-build-runtime/gradle-9.3.1`. The exact build command was:

```sh
cd android
NODE_ENV=production \
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
ANDROID_HOME=/tmp/wellm-android-sdk \
/tmp/wellm-build-runtime/gradle-9.3.1/bin/gradle \
:wellm-snore:compileDebugKotlin :wellm-snore:testDebugUnitTest :app:assembleRelease \
--no-daemon -PreactNativeArchitectures=arm64-v8a --max-workers=4
```

With a normally configured Android SDK and JDK 17, the generated `./gradlew` can run those same tasks. A connected-device check returned no devices; installation and the thirty-minute locked-screen acceptance run remain pending.

## Real-device evidence

| Field                                         | Result                          |
| --------------------------------------------- | ------------------------------- |
| Tested git revision                           | Pending                         |
| Device / OS / build variant                   | Pending                         |
| Snoring clip source and permission            | Pending                         |
| Long-run start / stop wall-clock times        | Pending                         |
| Time with screen locked                       | Pending; minimum thirty minutes |
| Captured / analyzed / snoring / noisy seconds | Pending                         |
| Score / eligibility / exclusion reasons       | Pending                         |
| Loudest clip length and audible content       | Pending                         |
| Relaunch persistence and deletion             | Pending                         |
| Offline embedded-bundle run                   | Pending                         |
| Audio interruption / recovery                 | Pending                         |
| Battery usage and observed issues             | Pending                         |
| Two-minute screen recording link              | Pending                         |

Current limitation: host inference, native source compilation, and core algorithm tests do not establish phone microphone behavior, locked-screen continuity, background permission behavior, native playback, or actual snore accuracy. These require a successful full build installed on a real phone and the acceptance protocol in `device-testing.md`.

## 5 October 2026 browser and UI verification

The browser now uses real microphone PCM and the bundled YAMNet model through local LiteRT WASM. Production sample nights and synthesized recording data were removed. History starts empty and persists real summaries and WAV blobs in IndexedDB.

- `npm run check`: TypeScript, Expo lint, 29 domain/audio/permission/runtime regression tests, and formatting passed.
- `npm run build:web` and `npm run model:verify`: passed. Browser model checksum matches the native bundled model.
- Real microphone in the Codex browser: a short session displayed about 34 recorded seconds, 98% analysis coverage, score 0, and a ten-second saved clip. This was ambient microphone testing, not a validated snoring clip or physical-phone acceptance run.
- An isolated Chromium test captured a generated microphone audio fixture through the actual AudioWorklet/resampling/YAMNet pipeline. Initial capture was 14.128 seconds, with 13.65 analyzed seconds. Its ten-second WAV contained captured nonzero PCM. This test does not provide phone or real-snoring evidence.
- The isolated final browser run passed 23 checks, including chart growth anchored to the baseline and immediate rendering with reduced motion. It checked playback, reload persistence, repeated start/stop, reuse of already-loaded WASM, interruption and checkpoint recovery, denied permission, deletion, local Week dates, 320/390-pixel layouts, reduced motion, popup alignment, and inside/outside-click behavior. No JavaScript errors, console errors, or outgoing HTTP writes were observed in the isolated final run.
- Known startup/runtime issues fixed: ignored microphone permission now times out cleanly; late grants release their tracks; Fast Refresh preserves the engine and reuses loaded/pending LiteRT; stop disconnects queued worklet callbacks; stale provider reads cannot overwrite newer actions; playback cannot interfere with capture startup.
- Android source now uses cancellable nonblocking microphone reads and verifies retained clip paths. These fixes are compiled into the 1.0.1 preview below; physical-phone validation remains pending.

The physical-phone two-minute video and thirty-minute locked-screen run remain pending. Browser capture deliberately stops and marks an interruption when hidden; it does not claim native overnight continuity.

## 5 October 2026 Android preview 1.0.1

Published as [v1.0.1-preview](https://github.com/Suraj1812/WellM/releases/tag/v1.0.1-preview), with the APK, checksum, verification report, source revision, and Android clip-test XML. Built from `d4f111c22b79b264ab4c41c48006991a4a049235` on GitHub; [build run 37306480868](https://github.com/Suraj1812/WellM/actions/runs/37306480868) and [source CI run 37306468639](https://github.com/Suraj1812/WellM/actions/runs/37306468639) passed. This build uses the checked-in Android preview workflow and does not require an Expo account.

- Package `com.wellm.nights`, version `1.0.1`, version code `2`; `arm64-v8a`, minimum SDK 24, target SDK 36.
- APK size: 54,989,474 bytes. SHA-256: `368caabcf4b964ab3049f75dce83aae81ab998ea354a8670bd705fd5d05a2f31`.
- TypeScript, lint, formatting, and 29 source tests passed. Native compilation, the full release build, and three Android clip tests passed, with zero failures or errors.
- Embedded bundle: 2,374,200 bytes. The uncompressed model and its bundled license are present; the YAMNet checksum matches the audited native/browser model.
- APK signature and 16 KB ZIP alignment passed in CI. The downloaded artifact was independently checked against its checksum, source revision, embedded assets, and signer certificate.
- The preview signer SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching both the original APK and the Expo template certificate. Installing this preview over the original can preserve local recordings.

The physical-phone thirty-minute locked-screen run, two-minute snoring video, and complete iOS build remain pending. A successful APK build does not establish those device results.

## 5 October 2026 UI and dark-mode verification

Source revision: [`c4e67807`](https://github.com/Suraj1812/WellM/commit/c4e67807). [Source CI run 37328047162](https://github.com/Suraj1812/WellM/actions/runs/37328047162) passed. The [Android 1.0.3 preview build, run 37328092446](https://github.com/Suraj1812/WellM/actions/runs/37328092446), passed, including native compilation, three Android clip tests with zero failures or errors, release packaging, signature verification, and 16 KB ZIP alignment. Local TypeScript, lint, formatting, 29 tests, production web export, and Expo Doctor (21/21) also passed.

- Light and dark themes use the moon/sun button beside the header info button. Browser theme selection survives reload. Native selection is implemented using private device preferences; physical-phone persistence has not yet been verified on the updated build. Theme changes preserve the recording provider and session state.
- Browser UI checks covered the down/up chevrons beside Recording details/Hide details, the Week score without clipping, and chart information with the selected session's exclusion reasons. Actual chart values animate upward from the baseline, with immediate rendering when reduced motion is enabled.
- Popup headings and close buttons share an aligned row. Clicking outside closes the popup; clicking its body does not. The displayed notice stays unchanged during the exit fade.
- A real browser microphone recording with snoring playback displayed score **31**, **61 recorded seconds**, **18 detected snoring seconds**, **99% analysis coverage**, and **8% noisy analyzed audio**. These are rounded interface values from captured audio. This short session remains excluded from the weekly average because it is under 30 minutes; it provides browser inference evidence, not native phone evidence.

The user's report of score 0 while playing snoring on the Android phone remains unresolved. No verified thirty-minute screen-locked phone run or required two-minute real-phone video has been provided. Browser results and successful source CI do not establish those acceptance results.

### Android preview 1.0.3 artifact

[Release v1.0.3-preview](https://github.com/Suraj1812/WellM/releases/tag/v1.0.3-preview) contains the APK, checksum, verification report, exact source revision, and native test XML. Package `com.wellm.nights`, version `1.0.3`, version code `4`; `arm64-v8a`, minimum SDK 24, target SDK 36.

- APK size: 54,999,366 bytes. SHA-256: `f8e16e561035a72db6306899f54508c2c59d29f4918b78efbfb459db5f0c895b`.
- Embedded bundle: 2,384,068 bytes. The downloaded artifact contains both light/dark toggle labels, the appearance storage key, and compiled native preference methods. Its exact source revision and bundled YAMNet model/license were independently checked.
- The actual embedded signer certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching earlier previews. Install over the existing app; uninstalling removes its local history.
- Downloaded APK checksum matches the build report and checksum file. The three native tests have zero failures, errors, or skipped tests.

This release changes appearance and UI behavior; it does not resolve the reported physical-phone score-0 case or replace the outstanding device acceptance evidence.
