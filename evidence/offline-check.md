# Offline check (AC06, AC07)

| Part | Status |
|---|---|
| Local browser check: load once, stop the server, reload and use the app | PASSED on 3 October 2026, steps below |
| Deploy to the static host | NOT DONE |
| Real phone in airplane mode, including a reload | NOT DONE |

AC06 and AC07 stay NOT VERIFIED until the phone steps are done; the local check shows the service worker does its job in one desktop browser.

## Local browser check

- Code: branch `17-service-worker` merged with main at 286e662, service worker cache `sankofafresh-6353f04814539408`, model `tree-v2-b7a4e1c`.
- Browser: Chromium driven by Playwright (user agent Chrome/154), viewport 360 by 740.
- Server: `cd web && python3 -m http.server 8770 --bind 127.0.0.1`, so `web/` is the site root. `http://127.0.0.1` counts as a secure context, so the service worker and Web Crypto both run.

| Step | What was done | Result |
|---|---|---|
| 1 | Unregister any service worker, delete caches and clear localStorage for the origin | Clean start |
| 2 | Open `http://127.0.0.1:8770/index.html` once, online (20:16:22 UTC) | Consent screen. The page is controlled by `sw.js`, and cache `sankofafresh-6353f04814539408` holds 17 files: app.js, canonical.js, contract.json, features.js, the three icons, index.html, manifest.webmanifest, messages.en.json, messages.tw.draft.json, metrics.json, storage.js, styles.css, tree.js, tree.json, weather.json |
| 3 | Stop the server (20:16:28 UTC) | `curl` to the server exits with code 7, connection refused |
| 4 | Reload the page | Consent screen in English, no error notice |
| 5 | Continue, then run four checks | See the table below; each opened its result screen |
| 6 | Reload again and open the batch list | All four batches listed with their bands and dates |
| 7 | Open About this check | Model `tree-v2-b7a4e1c`, its hash, file sizes 182 kB in total (measured from the 17 cached files), and the held-out metrics from `metrics.json` against the baseline, all read from the cache |

Checks run with the server stopped. Batches 1 to 3 are the video's demo batches from `evidence/demo_batches.json`; Batch 4 adds a red case.

| Batch | Answers | Result |
|---|---|---|
| Batch 1 | dried 12 days, not rewetted, raised, not musty, dry, stored 20 days from 2025-03-01 | Green, no reasons, no action, no SMS |
| Batch 2 | dried 8 days, rewetted, raised, not musty, damp, stored 10 days from 2025-01-15 | Amber; reason "Your hand or bite test did not find the beans dry."; action re-dry; SMS draft labelled SIMULATED_NOT_SENT |
| Batch 3 | as Batch 1, hand test "Don't know" | Not sure; reason "One question was answered "Don't know"."; action take a sample; SMS draft |
| Batch 4 | dried 4 days, not rewetted, raised, musty, damp, stored 30 days from 2025-01-05 | Red; reasons damp hand test and musty smell; action re-dry; SMS draft |

Network log for steps 4 to 7 (every response the page received): 32 responses, all served by the service worker. 30 were 200. 2 were 404s from the service worker for `audio/index.json`, which is not in this app version (no audio yet), so there is no Play button. No request reached the network.

An earlier run the same day, before `metrics.json` shipped (cache `sankofafresh-883356923ec6e172`, 16 files), passed the same way.

Update path, checked separately the same day: with the previous version (`sankofafresh-af307cdd19e47f99`) installed, loading the app online installed the new version, replaced the cache, and deleted the old one.

Screenshots: `evidence/screens/17-offline-reload-consent.png`, `17-offline-result-green.png`, `17-offline-result-amber.png`, `17-offline-result-red.png`, `17-offline-result-not-sure.png`, `17-offline-batches.png`, `17-offline-evidence.png`.

## Phone check (NOT DONE)

1. NOT DONE: deploy `web/` to the static host chosen in #1, over https.
2. NOT DONE: on the phone, open the app once online. Open About this check; File sizes shows a total only once the offline cache is complete.
3. NOT DONE: turn on airplane mode, close the browser completely, reopen the app and reload.
4. NOT DONE: run a check that gives each band, and a "Don't know" check.
5. NOT DONE: record the screen, and save the network log through remote debugging (Chrome `chrome://inspect` or Safari Web Inspector).

## Limits found during the check

- Plain http on a LAN address (for example `http://192.168.1.20:8000`) is not a secure context. There, the browser runs no service worker and offers no Web Crypto, so the app refuses the model. Use https, or `localhost` or `127.0.0.1` on the same machine.
- The cache only changes when `web/sw.js` changes. After any change to a file in `web/`, `PRECACHE` and `CACHE_VERSION` in `web/sw.js` must be updated, or installed phones keep the old files. `node --test tests/sw.test.mjs` fails until they are and prints the exact lines to use.
