# Offline check (AC06, AC07)

| Part | Status |
|---|---|
| Local browser check: load once, stop the server, reload and use the app | PASSED on 3 October 2026, against the current tree, steps below |
| Deploy to the static host | NOT DONE: the public link isn't live yet |
| Real phone in airplane mode, including a reload | NOT DONE: waits for the public link |

AC06 and AC07 stay NOT VERIFIED until the phone steps are done. The local check shows the service worker works in one desktop browser.

## Local browser check

- Code: branch `19-twi-pass` from main at cd865ba, service worker cache `sankofafresh-53bcc1757d374b7d`, model `tree-v2-9b83270` (115 nodes, abstain cut 0.442), languages English and Twi.
- Browser: Chromium 154 driven by Playwright, viewport 360 by 740, on a desktop computer.
- Server: `cd web && python3 -m http.server 8770 --bind 127.0.0.1`, so `web/` is the site root. `http://127.0.0.1` counts as a secure context, so the service worker and Web Crypto both run.

| Step | What was done | Result |
|---|---|---|
| 1 | Unregister any service worker, delete caches and clear localStorage for the origin | Clean start |
| 2 | Open `http://127.0.0.1:8770/index.html` once, online (22:56:27 UTC) | Consent screen. The page is controlled by `sw.js`, and cache `sankofafresh-53bcc1757d374b7d` holds 18 files: app.js, canonical.js, contract.json, demo_batches.json, features.js, the three icons, index.html, manifest.webmanifest, messages.en.json, messages.tw.json, metrics.json, storage.js, styles.css, tree.js, tree.json, weather.json |
| 3 | Stop the server (22:56:34 UTC) | `curl` to the server exits with code 7, connection refused |
| 4 | Reload the page | Consent screen in English, no error notice |
| 5 | Continue, then Settings > Load demo batches | Batches 1 to 3 added, marked "Demo data, not a real batch" |
| 6 | Run two more checks through the form | See the table below |
| 7 | Switch to Twi in Settings and reload | The app reloads in Twi; `messages.tw.json` came from the cache |
| 8 | Open the batch list, switch back to English, reload again | All five batches listed with their bands |
| 9 | Open About this check | Model `tree-v2-9b83270`, its hash, and file sizes 198.6 kB in total, measured from the 18 cached files, with the held-out metrics |

| Batch | Answers | Result |
|---|---|---|
| Batch 1 (demo) | dried 12 days, not rewetted, raised, not musty, dry, stored 20 days from 2025-03-01 | Green, no reasons, no action, no SMS |
| Batch 2 (demo) | dried 8 days, rewetted, raised, not musty, damp, stored 10 days from 2025-01-15 | Amber; reason "Your hand or bite test did not find the beans dry."; action re-dry; SMS draft labelled SIMULATED_NOT_SENT |
| Batch 3 (demo) | as Batch 1, hand test "Don't know" | Not sure; reason "One question was answered "Don't know"."; action take a sample; SMS draft |
| Batch 4 | dried 4 days, not rewetted, raised, musty, damp, stored 30 days from 2025-01-05 | Amber; reasons damp hand test and musty smell; action re-dry. This batch was red under the previous depth-4 tree |
| Batch 5 | dried 3 days, rewetted, on the floor, musty, damp, stored 30 days from 2025-01-05 | Red; reasons damp hand test and musty smell; action re-dry; SMS draft |

Network log for steps 4 to 9 (every response the page received): 54 responses, all served by the service worker. 51 were 200. 3 were 404s from the worker for `audio/index.json`, which is not in this app version (no audio yet), so there is no Play button. No request reached the network. The log also holds one test probe of my own for `sw.js`, which the worker answered with a 404; it is not app traffic and isn't counted above.

Screenshots: `evidence/screens/17-offline-reload-consent.png`, `17-offline-result-green.png`, `17-offline-result-amber.png`, `17-offline-result-red.png`, `17-offline-result-not-sure.png`, `17-offline-batches.png`, `17-offline-batches-tw.png`, `17-offline-evidence.png`.

Earlier runs on the same day, with the depth-4 tree `tree-v2-b7a4e1c` (caches `sankofafresh-883356923ec6e172` and `sankofafresh-6353f04814539408`), passed the same way. The update path from an older cache version to a newer one was also checked: the new version replaced the old cache and deleted it.

## Phone check (NOT DONE)

1. NOT DONE: deploy `web/` to the static host over https, once the public link exists.
2. NOT DONE: on the phone, open the app once online. Open About this check; File sizes shows a total only once the offline cache is complete.
3. NOT DONE: turn on airplane mode, close the browser completely, reopen the app and reload.
4. NOT DONE: load the demo batches, run a check that gives each band and a "Don't know" check, and switch to Twi.
5. NOT DONE: record the screen, and save the network log through remote debugging (Chrome `chrome://inspect` or Safari Web Inspector).

## Limits found during the check

- Plain http on a local network address is not a secure context. There, the browser runs no service worker and offers no Web Crypto, so the app refuses the model. Use https, or `localhost` or `127.0.0.1` on the same machine.
- The cache only changes when `web/sw.js` changes. After any change to a file in `web/`, `PRECACHE` and `CACHE_VERSION` in `web/sw.js` must be updated, or installed phones keep the old files. `node --test tests/sw.test.mjs` fails until they are and prints the exact lines to use.
