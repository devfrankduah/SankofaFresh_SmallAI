# Offline check (AC06, AC07)

| Part | Status |
|---|---|
| Local browser check: load once, stop the server, reload and use the app | PASSED on 3 October 2026 (20:09 ET), on the current build, steps below |
| Deploy to the static host | DONE: live at https://devfrankduah.github.io/SankofaFresh_SmallAI/, deployed by GitHub Pages from main (`.github/workflows/pages.yml`) |
| Real phone in airplane mode, including a reload | NOT DONE: phone steps 2 to 5 below |

AC06 stays PENDING until the phone steps are done. AC07 is verified by the desktop network log below; the phone log comes with step 5. The local check shows the service worker works in one desktop browser.

## Local browser check

- Code: main at 3e9f842 (after the bagging-date form, #66, the Sankofa identity, #69, and the app name key, #70), service worker cache `sankofafresh-07d3530c1bf503b0`, model `tree-v2-9b83270` (115 nodes, abstain cut 0.442), languages English and Twi.
- Browser: Chromium 154 driven by Playwright in a fresh browser context, viewport 360 by 740, on a desktop computer.
- Server: `cd web && python3 -m http.server 8770 --bind 127.0.0.1`, so `web/` is the site root. `http://127.0.0.1` counts as a secure context, so the service worker and Web Crypto both run.

| Step | What was done | Result |
|---|---|---|
| 1 | Open `http://127.0.0.1:8770/index.html` once in a new context, online (00:09:25 UTC on 4 October) | Welcome screen. The page is controlled by `sw.js`, and cache `sankofafresh-07d3530c1bf503b0` holds 18 files: app.js, canonical.js, contract.json, demo_batches.json, features.js, the three icons, index.html, manifest.webmanifest, messages.en.json, messages.tw.json, metrics.json, storage.js, styles.css, tree.js, tree.json, weather.json |
| 2 | Stop the server (00:09:31 UTC) | `curl` to the server exits with code 7, connection refused |
| 3 | Reload the page | Welcome screen in English (SankofaFresh, the promise, "Works with no signal", the two languages), no error notice |
| 4 | Continue, then Load demo batches from the empty list | Batches 1 to 3 added, worst first, marked "Demo data, not a real batch" |
| 5 | Run a check through the one-question-per-screen form, all seven steps. On the last step, first pick 20 October 2026 as the bagging date | The picker's maximum is today (2026-10-03). The future date shows "That date is after today." and the Check button stays disabled until the date is changed to 3 September 2026 |
| 6 | Open each result | Each stamp landed, with its why chips and humidity line, as listed below. The list reads "3 of 4 batches need a check" |
| 7 | Switch to Twi in Settings and reload | The app reloads in Twi; `messages.tw.json` came from the cache; the batch list shows all four batches with their stamps |
| 8 | Switch back to English, reload, open About this check | Model `tree-v2-9b83270`, its hash, and file sizes 226.8 kB in total, measured from the 18 cached files, with the held-out metrics |

| Batch | Answers | Result |
|---|---|---|
| Batch 1 (demo) | dried 12 days, not rewetted, raised, not musty, dry, stored 20 days from 2025-03-01 | Green, no reasons, no action; humidity line 67.4% to 78.2% |
| Batch 2 (demo) | dried 8 days, rewetted, raised, not musty, damp, stored 10 days from 2025-01-15 | Amber; chip "Your hand or bite test did not find the beans dry."; action re-dry; humidity line 50.4% to 80% |
| Batch 3 (demo) | as Batch 1, hand test "Don't know" | Not sure; chip "One question was answered "Don't know"."; action take a sample; no humidity line |
| Batch 4 | dried 3 days, rewetted, on the floor, musty, damp, bagged 2026-09-03, so the app worked out 30 days stored | Red; chips for the damp hand test and the musty smell; action re-dry; humidity line 83.5% to 90.1% |

Network log for steps 3 to 8 (every response the page received): 62 responses, all served by the service worker. 59 were 200. 3 were 404s from the worker for `audio/index.json`, which is not in this app version (no audio yet), so there is no Play button. No request reached the network and none failed.

Screenshots: `evidence/screens/17-offline-reload-consent.png`, `17-offline-result-green.png`, `17-offline-result-amber.png`, `17-offline-result-red.png`, `17-offline-result-not-sure.png`, `17-offline-batches.png`, `17-offline-batches-tw.png`, `17-offline-evidence.png`.

Earlier runs the same day passed the same way: on cache `sankofafresh-cde8e6c93a4e562e` after the result-screen and check-form redesign, on `sankofafresh-53bcc1757d374b7d` before it, and on the depth-4 tree `tree-v2-b7a4e1c` (caches `sankofafresh-883356923ec6e172` and `sankofafresh-6353f04814539408`). The update path from an older cache version to a newer one was also checked: the new version replaced the old cache and deleted it.

## Phone check (NOT DONE)

1. DONE: `web/` is deployed over https at https://devfrankduah.github.io/SankofaFresh_SmallAI/ by GitHub Pages from main.
2. NOT DONE: on the phone, open the app once online. Open About this check: the offline cache is complete when File sizes lists all 18 files (226.8 kB at 3e9f842). Before that it lists only the files the page has loaded so far.
3. NOT DONE: turn on airplane mode, close the browser completely, reopen the app and reload.
4. NOT DONE: load the demo batches, run a check that gives each band and a "Don't know" check, and switch to Twi. In one check, pick a bagging date after today: the app should say "That date is after today." and keep the Check button disabled (the date is the last step, so its button reads Check rather than Continue; iOS date pickers ignore a maximum date, which is why the app checks it).
5. NOT DONE: record the screen, and save the network log through remote debugging (Chrome `chrome://inspect` or Safari Web Inspector).

## Limits found during the check

- Plain http on a local network address is not a secure context. There, the browser runs no service worker and offers no Web Crypto, so the app refuses the model. Use https, or `localhost` or `127.0.0.1` on the same machine.
- The cache only changes when `web/sw.js` changes. After any change to a file in `web/`, `PRECACHE` and `CACHE_VERSION` in `web/sw.js` must be updated, or installed phones keep the old files. `node --test tests/sw.test.mjs` fails until they are and prints the exact lines to use.
