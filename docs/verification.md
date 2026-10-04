# Verification log

Keep build-time checks and physical-device evidence separate. Update this file with actual results; do not change pending rows to passed without running the corresponding check.

## Automated checks

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
| GitHub CI                          | Configured; remote run pending  | Workflow syntax, commands, and action tags validated locally                                                                      |

During implementation, `npm audit` reported 30 advisories in inherited toolchain dependencies. A compatible automatic fix was unavailable. The project retains SDK-compatible dependencies; review upstream maintainer updates instead of forcing an incompatible SDK downgrade.

## Android preview artifact

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
