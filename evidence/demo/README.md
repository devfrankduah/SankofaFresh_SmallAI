# Demo captures for the video

Captured on 3 October 2026 from `web/` at main e756404. That build includes the welcome explainer (#75), the depth pass (#77), the result screen that reads without reading (#79), the house button with one meaning per picture (#80), Ghanaian dates with About this check in two parts (#83), plain-language labels (#84), and the plain weather note (#87). It was served with `python3 -m http.server` on 127.0.0.1. The browser was Chromium 154 driven by Playwright, emulating a phone with a 390 by 844 viewport at 2x pixel density, so every image is 780 by 1688 (the full-page evidence capture is taller). The stills were taken with reduced motion, so no stamp is caught mid-landing. The model is the shipped tree `tree-v2-9b83270`, and the metrics are the real `web/metrics.json`. Everything shown is SYNTHETIC_DEMO: results on synthetic labels, not field accuracy.

| File | Screen |
|---|---|
| `01-consent.png` | Welcome, top: the embossed Sankofa mark, SankofaFresh, the promise in English and in Twi, "Works with no signal", and English and Twi as pressable tiles |
| `15-welcome-how.png` | Welcome, scrolled: How it works in three numbered steps with pictures (a sack, a phone with a cloud, a stamp), then the consent text and Continue |
| `12-consent-tw.png`, `16-welcome-how-tw.png` | The same two views after tapping Twi: everything switches except the promise line, which shows both languages |
| `02-empty-list.png` | Empty batch list: a sack, Load demo batches, and Add batch in the dock; the header has the house and Settings |
| `03-batch-list.png` | After Load demo batches: "2 of 3 batches need a check", worst first, each row with its band edge, stamp, band words and the date as "3 Oct 2026", and the text tag "Demo data, not a real batch" |
| `04-check-form.png` | The check form: step 4 of 7, "Where are the bags?", with On the floor picked, Back and Continue |
| `14-bagging-date-future.png` | The last step, "When did you bag it?", with a date after today: "That date is after today." and the Check button disabled |
| `09-result-red.png` | A check entered through the form (dried 3 days, rewetted, on the floor, musty, damp, bagged 3 September 2026): red stamp, the hand and nose chips |
| `17-result-red-weather.png` | The same result scrolled: the re-dry action with its picture (sun over a drying table), then 14 drops in two rows, because every day of that September window was above 80% humidity |
| `05-result-green.png` | Batch 1, clearly safe: green stamp, no reasons, no action, 14 suns |
| `06-result-amber.png` | Batch 2, rewetted with a damp hand test: amber stamp; the hand chip; the re-dry action; 14 suns (the wettest day is exactly 80%) |
| `07-result-not-sure.png` | Batch 3, hand test "Don't know": not sure, the question-mark chip and the take-a-sample action with its picture (a person carrying a sack); no weather row, because the answers don't reach the weather |
| `08-sms-draft.png` | Batch 2's SMS draft under "Not sent. You decide whether to send it.", just after Copy SMS (the button reads "Copied"); above it the plain label "Practice result: this check learned from made-up examples, not from real farms." |
| `10-evidence-top.png` | About this check, opened from the red result, for farmers: the practice-result label, How it works, "This check can be wrong. If it says not sure, ask a person at the cooperative.", that records stay on this phone, and Technical details closed |
| `18-about-technical.png`, `11-evidence-full.png` | Technical details opened: Batch 4's exact humidity line with the 80% mark, the model version, tree hash, the 18 cached files (247.8 kB), the held-out metrics against the humidity-only baseline, and the data sources |
| `13-result-amber-tw.png` | Batch 2 in Twi; the date is 03/10/2026, as every Twi date is numeric and day first |
| `demo-flow.mp4` | Screen recording, 58.1 s, H.264, no audio. It opens on the welcome, scrolls through How it works, taps Twi and back to English, then Continue and Load demo batches. It shows the amber result with its weather row and Copy SMS, the not-sure result with its action picture and the green result, each left through the house. It then runs a check through all seven form steps, where a bagging date after today is refused, to a red result with 14 drops, opens About this check, and finally opens Technical details down to the metrics and sources |

No Play button appears: no Twi recordings have been delivered yet. The list of clips to record is in the team's recording folder, and the button shows on results and form questions once `web/audio/index.json` lists them.

The answers behind the three demo batches are in `evidence/demo_batches.json`, and the app loads them from `web/demo_batches.json`. For the voice-over: the reason shown on the amber batch is the damp hand test. The app shows reasons from the tree's decision path, so it doesn't claim the rain caused the result.
