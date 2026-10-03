# Demo captures for the video

Captured on 3 October 2026 from `web/` at main 815d1d7 (identical to the captured branch), served with `python3 -m http.server` on 127.0.0.1. The browser was Chromium 154 driven by Playwright, emulating a phone with a 390 by 844 viewport at 2x pixel density, so every image is 780 by 1688. The model is the shipped tree `tree-v2-9b83270`, and the metrics are the real `web/metrics.json`. Everything shown is SYNTHETIC_DEMO: results on synthetic labels, not field accuracy.

| File | Screen |
|---|---|
| `01-consent.png` | First-run consent |
| `02-batch-list.png` | Batch list after Settings > Load demo batches, each batch marked "Demo data, not a real batch" |
| `03-check-form.png` | Tap-only check form |
| `04-result-green.png` | Batch 1, clearly safe: green, no reasons, no action |
| `05-result-amber.png` | Batch 2, rewetted with a damp hand test: amber, reason "Your hand or bite test did not find the beans dry.", action re-dry |
| `06-result-not-sure.png` | Batch 3, hand test "Don't know": not sure, reason and action to take a sample |
| `07-sms-draft.png` | Batch 2's SMS draft labelled SIMULATED_NOT_SENT, with Copy SMS |
| `08-evidence-top.png`, `09-evidence-full.png` | About this check: model version, tree hash, file sizes and the held-out metrics against the humidity-only baseline |
| `demo-flow.mp4` | Screen recording, 30.6 s, H.264, no audio: from Settings, Load demo batches, then the three results, the SMS draft and Copy SMS, the check form and the evidence screen |

The answers behind the three demo batches are in `evidence/demo_batches.json`, and the app loads them from `web/demo_batches.json`. For the voice-over: the reason shown on the amber batch is the damp hand test. The app shows reasons from the tree's decision path, so it doesn't claim the rain caused the result.
