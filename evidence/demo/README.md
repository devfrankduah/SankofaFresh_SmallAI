# Demo captures for the video

Captured on 3 October 2026 from `web/` at main f1d6b44, after the result-screen and check-form redesign (#58, #60). It was served with `python3 -m http.server` on 127.0.0.1. The browser was Chromium 154 driven by Playwright, emulating a phone with a 390 by 844 viewport at 2x pixel density, so every image is 780 by 1688. The model is the shipped tree `tree-v2-9b83270`, and the metrics are the real `web/metrics.json`. Everything shown is SYNTHETIC_DEMO: results on synthetic labels, not field accuracy.

These captures predate [#66](https://github.com/devfrankduah/SankofaFresh_SmallAI/pull/66), which replaced the days-stored step with the bagging date. A new check now has seven steps, not the eight shown in `04-check-form.png` and `demo-flow.mp4`.

| File | Screen |
|---|---|
| `01-consent.png` | First-run consent |
| `02-empty-list.png` | Empty batch list: a sack, Load demo batches, and Add batch in the dock |
| `03-batch-list.png` | After Load demo batches: each batch a sack with its stamp, marked "Demo data, not a real batch" |
| `04-check-form.png` | The check form, one question per screen: step 4 of 8, "Where are the bags?", with picture tiles, Back and Continue |
| `05-result-green.png` | Batch 1, clearly safe: green stamp on the batch card, no reasons, no action, the humidity line |
| `06-result-amber.png` | Batch 2, rewetted with a damp hand test: amber stamp; why chip "Your hand or bite test did not find the beans dry."; action re-dry; humidity line touching 80% |
| `07-result-not-sure.png` | Batch 3, hand test "Don't know": not sure, a question-mark chip and the action to take a sample. There is no humidity line, because the answers don't reach the weather |
| `08-sms-draft.png` | Batch 2's SMS draft labelled SIMULATED_NOT_SENT, just after Copy SMS (the button reads "Copied") |
| `09-result-red.png` | A check entered through the form (dried 3 days, rewetted, on the floor, musty, damp): red stamp, hand and smell chips, action re-dry |
| `10-evidence-top.png`, `11-evidence-full.png` | About this check: model version, tree hash, file sizes and the held-out metrics against the humidity-only baseline |
| `12-consent-tw.png` | First-run consent in Twi |
| `13-result-amber-tw.png` | Batch 2 in Twi; dates in Twi mode are numeric (3/10/2026) because browsers have no Twi date formats |
| `demo-flow.mp4` | Screen recording, 36.5 s, H.264, no audio. It starts on the empty list at Load demo batches, then shows the three results as their stamps land, the SMS draft and Copy SMS, a check through all eight form steps to a red result, and the evidence screen |

The answers behind the three demo batches are in `evidence/demo_batches.json`, and the app loads them from `web/demo_batches.json`. For the voice-over: the reason shown on the amber batch is the damp hand test. The app shows reasons from the tree's decision path, so it doesn't claim the rain caused the result.
