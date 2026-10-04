# Offline check (AC06, AC07)

| Part | Status |
|---|---|
| Local browser check: load once, stop the server, reload and use the app | PASSED on 3 October 2026 (21:14 ET), on the current build, steps below |
| Deploy to the static host | DONE: live at https://devfrankduah.github.io/SankofaFresh_SmallAI/, deployed by GitHub Pages from main (`.github/workflows/pages.yml`) |
| Real phone in airplane mode, including a reload | DONE on an iPhone 15 Pro Max in Safari, reported 3 October 2026: phone check below |

AC06 is verified by the phone check below; no screen recording of it is linked. AC07 is verified by the desktop network log below; no phone network log is linked. The local check shows the service worker works in one desktop browser, and the phone check shows it works in Safari on one iPhone.

## Local browser check

- Code: main at e756404 (after the welcome explainer, #75, the depth pass, #77, the result screen that reads without reading, #79, the house button and icon vocabulary, #80, Ghanaian dates and About this check in two parts, #83, plain-language labels, #84, and the plain weather note, #87), service worker cache `sankofafresh-a0a4613a27b4e0f0`, model `tree-v2-9b83270` (115 nodes, abstain cut 0.442), languages English and Twi.
- Browser: Chromium 154 driven by Playwright in a fresh browser context, viewport 360 by 740, on a desktop computer.
- Server: `cd web && python3 -m http.server 8770 --bind 127.0.0.1`, so `web/` is the site root. `http://127.0.0.1` counts as a secure context, so the service worker and Web Crypto both run.

| Step | What was done | Result |
|---|---|---|
| 1 | Open `http://127.0.0.1:8770/index.html` once in a new context, online (01:14:43 UTC on 4 October) | Welcome screen. The page is controlled by `sw.js`, and cache `sankofafresh-a0a4613a27b4e0f0` holds 18 files: app.js, canonical.js, contract.json, demo_batches.json, features.js, the three icons, index.html, manifest.webmanifest, messages.en.json, messages.tw.json, metrics.json, storage.js, styles.css, tree.js, tree.json, weather.json |
| 2 | Stop the server (01:14:50 UTC) | `curl` to the server exits with code 7, connection refused |
| 3 | Reload the page | Welcome screen in English (SankofaFresh, the promise in English and Twi, "Works with no signal", the two languages, How it works), no error notice |
| 4 | Continue, then Load demo batches from the empty list | Batches 1 to 3 added, worst first, marked "Demo data, not a real batch", each dated "3 Oct 2026" |
| 5 | Run a check through the one-question-per-screen form, all seven steps. On the last step, first pick 20 October 2026 as the bagging date | The future date shows "That date is after today." and the Check button stays disabled until the date is changed to 3 September 2026 |
| 6 | Open each result, going back each time with the house in the header | Each result shows its stamp, why chips, action picture, weather row and "Practice result: …" label, as listed below; the SMS draft sits under "Not sent. You decide whether to send it." The list reads "3 of 4 batches need a check" |
| 7 | Switch to Twi in Settings and reload | The app reloads in Twi; `messages.tw.json` came from the cache; the batch list shows all four batches, every date as 03/10/2026 |
| 8 | Switch back to English, reload on Batch 4's result, open About this check from it, then open Technical details | `#/evidence/Batch%204` opens on the farmer part with Technical details closed. Opened: Batch 4's humidity line (83.5% to 90.1%), model `tree-v2-9b83270`, its hash, and file sizes 247.8 kB in total, measured from the 18 cached files, with the held-out metrics |

| Batch | Answers | Result |
|---|---|---|
| Batch 1 (demo) | dried 12 days, not rewetted, raised, not musty, dry, stored 20 days from 2025-03-01 | Green, no reasons, no action; 14 suns ("0 of these 14 days had very damp air in 2025.") |
| Batch 2 (demo) | dried 8 days, rewetted, raised, not musty, damp, stored 10 days from 2025-01-15 | Amber; chip "Your hand or bite test did not find the beans dry."; re-dry with its picture; 14 suns (the wettest day is 80.0%, not above it) |
| Batch 3 (demo) | as Batch 1, hand test "Don't know" | Not sure; chip "One question was answered "Don't know"."; take a sample with its picture; no weather row |
| Batch 4 | dried 3 days, rewetted, on the floor, musty, damp, bagged 2026-09-03, so the app worked out 30 days stored | Red; chips for the damp hand test and the musty smell; re-dry; 14 drops ("14 of these 14 days had very damp air in 2025.") |

Network log for steps 3 to 8 (every response the page received): 62 responses, all served by the service worker. 59 were 200. 3 were 404s from the worker for `audio/index.json`, which is not in this app version (no recordings yet), so there is no Play button. No request reached the network and none failed.

Screenshots: `evidence/screens/17-offline-reload-consent.png`, `17-offline-result-green.png`, `17-offline-result-amber.png`, `17-offline-result-red.png`, `17-offline-result-not-sure.png`, `17-offline-batches.png`, `17-offline-batches-tw.png`, `17-offline-evidence.png`.

Earlier runs the same day passed the same way: on cache `sankofafresh-d130451f6c75318b` before the plain weather note, `sankofafresh-7a5aa463cf27b08b` before the plain-language round, `sankofafresh-c892176027866dda` after the depth pass, `sankofafresh-07d3530c1bf503b0` after the Sankofa identity, `sankofafresh-cde8e6c93a4e562e` after the result-screen and check-form redesign, `sankofafresh-53bcc1757d374b7d` before it, and on the depth-4 tree `tree-v2-b7a4e1c` (caches `sankofafresh-883356923ec6e172` and `sankofafresh-6353f04814539408`). The update path from an older cache version to a newer one was also checked: the new version replaced the old cache and deleted it.

## Phone check (iPhone 15 Pro Max, Safari)

A team member ran this on the live app and reported the results on 3 October 2026.

1. DONE: `web/` is deployed over https at https://devfrankduah.github.io/SankofaFresh_SmallAI/ by GitHub Pages from main.
2. DONE: the app was opened once online. That one load was enough for it to work offline.
3. DONE: with airplane mode on, the page reloaded and the app worked.
4. DONE: with airplane mode on, the demo batches, all results and Twi worked.
5. DONE: a bagging date after today was refused.
6. DONE: double-tap no longer zooms the page.
7. NOT LINKED: no screen recording and no Safari network log of this check are linked here.

## Limits found during the check

- Plain http on a local network address is not a secure context. There, the browser runs no service worker and offers no Web Crypto, so the app refuses the model. Use https, or `localhost` or `127.0.0.1` on the same machine.
- The cache only changes when `web/sw.js` changes. After any change to a file in `web/`, `PRECACHE` and `CACHE_VERSION` in `web/sw.js` must be updated, or installed phones keep the old files. `node --test tests/sw.test.mjs` fails until they are and prints the exact lines to use.
