# WellM application package

Prepare the code link and real-phone video, then replace the personal and evidence placeholders below. This is a reviewable draft; it has not been emailed. Do not claim physical-device checks you have not completed.

## Required artifacts

- Code: https://github.com/Suraj1812/WellM
- Two-minute recording from a real phone: `[Your video URL]`
- Thirty-minute locked-screen evidence: results in `docs/verification.md`
- Current Delhi NCR locality: `[Your actual current locality, city]`
- Notice period: `[Your actual notice period]`

## Five lines: score and limits

1. My 0–100 score is `round(100 × detected snoring seconds / analyzed seconds)`; higher means more detected snoring, not better or worse sleep quality.
2. YAMNet runs on the phone on non-overlapping 0.975-second windows; Snoring confidence ≥0.35 counts only when speech, music, television, or clipping has not made that window noisy.
3. A night counts only after ≥30 captured minutes, ≥90% analysis coverage, ≤30% noisy analyzed audio, and no recording interruption; excluded nights keep their reasons.
4. Snoring minutes are estimated sound time, and the saved ten-second clip is the loudest captured sound by rolling RMS; it may be another noise rather than snoring.
5. Audio stays on the phone, and the estimate cannot identify the sleeper, establish sleep quality, diagnose sleep apnea, or substitute for a medical assessment.

## Five lines: AI use and checks

Edit these lines after reviewing the code yourself, and add the real-phone outcome before submission.

1. I used Codex for the React Native/native implementation, tests, and documentation, and image generation for logo-based identity assets and the bedside photograph.
2. I used parallel agents for Android, iOS, and shared policy work, then checked that their interfaces, units, thresholds, and score direction agree.
3. Automated tests checked score boundaries, noisy-window precedence, missing analysis, interruptions, calendar dates, sample data, and rolling-RMS clip selection; results are in the verification log.
4. I reviewed the public model documentation, local audio lifecycle, permissions, storage, and deletion, and visually checked the generated logo and photograph against the supplied identity and intended layout.
5. Real-phone clip playback and thirty-minute locked-screen capture are `[pending / tested on DEVICE, OS; summarize the measured result]`; I can explain the code and its remaining limitations.

## Email draft

**To:** aditya@wellm.co

**Subject:** WellM Full Stack Engineer — on-device snoring app

Hi Aditya,

Here is my WellM take-home: a React Native app with Tonight, Morning, and My week screens, local YAMNet inference, a loudest-ten-seconds playback clip, and explicit reasons when a night does not count.

Code: https://github.com/Suraj1812/WellM

Real-phone, two-minute demo: `[Video URL]`

Device verification: `[Device and OS, measured locked-screen capture duration, and result]`

`[Paste the five score lines above.]`

`[Paste the five reviewed AI-use lines above.]`

I currently live in `[Current Delhi NCR locality, city]`. My notice period is `[Notice period]`.

Thanks,

`[Your name]`

## Before sending

Confirm the repository includes the native module and model provenance, run the checks, finish the physical-phone protocol, ensure reviewers can access both links, fill every placeholder, and review the full five-line explanations. Follow `docs/device-testing.md` for the video outline. The project and the candidate's current Delhi NCR residence are separate requirements; only state your actual location.
