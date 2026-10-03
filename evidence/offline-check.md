# Offline check (AC06, AC07)

| Part | Status |
|---|---|
| Local browser check: load once, stop the server, reload and use the app | PASSED on 3 October 2026, steps below |
| Deploy to the static host | NOT DONE |
| Real phone in airplane mode, including a reload | NOT DONE |

AC06 and AC07 stay NOT VERIFIED until the phone steps are done; the local check shows the service worker does its job in one desktop browser.

## Local browser check

- Code: branch `17-service-worker`, service worker cache `sankofafresh-883356923ec6e172`, model `tree-v2-b7a4e1c`.
- Browser: Chromium driven by Playwright (user agent Chrome/154), viewport 360 by 740.
- Server: `cd web && python3 -m http.server 8770 --bind 127.0.0.1`, so `web/` is the site root. `http://127.0.0.1` counts as a secure context, so the service worker and Web Crypto both run.

| Step | What was done | Result |
|---|---|---|
| 1 | Unregister any service worker, delete caches and clear localStorage for the origin | Clean start |
| 2 | Open `http://127.0.0.1:8770/index.html` once, online (20:11:17 UTC) | Consent screen. The page is controlled by `sw.js`, and cache `sankofafresh-883356923ec6e172` holds 16 files: app.js, canonical.js, contract.json, features.js, the three icons, index.html, manifest.webmanifest, messages.en.json, messages.tw.draft.json, storage.js, styles.css, tree.js, tree.json, weather.json |
| 3 | Stop the server (20:11:25 UTC) | `curl` to the server exits with code 7, connection refused |
| 4 | Reload the page | Consent screen in English, no error notice |
| 5 | Continue, then run four checks | See the table below; each opened its result screen |
| 6 | Reload again and open the batch list | All four batches listed with their bands and dates |
| 7 | Open About this check | Model `tree-v2-b7a4e1c`, its hash, and file sizes 181.5 kB in total, measured from the 16 cached files |

Checks run with the server stopped. Unless the table says otherwise, each batch was dried 12 days, not rewetted, raised, not musty, dry by the hand test, and stored 30 days from 2025-01-05.

| Batch | Answers that differ | Result |
|---|---|---|
| Batch 1 | none | Green, no reasons, no action, no SMS |
| Batch 2 | hand test damp | Amber; reason "Your hand or bite test did not find the beans dry."; action re-dry; SMS draft labelled SIMULATED_NOT_SENT |
| Batch 3 | dried 4 days, damp, musty | Red; reasons damp hand test and musty smell; action re-dry; SMS draft |
| Batch 4 | musty smell "Don't know" | Not sure; reason "One question was answered "Don't know"."; action take a sample; SMS draft |

Network log for steps 4 to 7 (every response the page received): 32 responses, all served by the service worker. 28 were 200. 4 were 404s from the service worker for `metrics.json` and `audio/index.json`, which are not in this app version yet, so the evidence screen shows "Not evaluated" and there is no Play button. No request reached the network.

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
