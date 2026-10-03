# Backlog migration: v1 issues to Spec v2

The team agreed Spec v2 (`docs/SankofaFresh_Spec_v2.md`) on 3 October 2026. Existing issues #1 to #22 were written for v1. This file is the source of truth for updating them. Reuse an issue where its area maps to v2 work, close it as not planned where v2 removes the work, and create new issues only where nothing maps.

Keys change where the meaning changes. `published.json` must be migrated so each new key keeps its old issue number and node ID.

## Mapping

| # | Old key | New key | Action | Priority | New title | Blocked by (new keys) |
|---|---|---|---|---|---|---|
| 1 | coordination | coordination | edit | P0 | Confirm deadline, submission format, language, demo location and repo visibility | none |
| 2 | contracts | contracts | edit | P0 | Freeze v2 contracts: inputs, features, abstention, tree.json and message keys | none |
| 3 | scaffold | scaffold | edit | P0 | Scaffold v2 layout: data/, model/, tests/, web/, pinned tooling and CI | none |
| 4 | storage | device_records | edit | P0 | On-device batch records, consent screen and delete-all | contracts, scaffold |
| 5 | simulator | weather | edit | P0 | Fetch and bundle NASA POWER weather for the demo location | scaffold |
| 6 | features | features | edit | P0 | Shared feature encoding and abstention rules in Python and JS | contracts, scaffold |
| 7 | batch_api | batch_api | close, not planned | | | |
| 8 | policy | bands_baseline | edit | P0 | Result bands, not_sure band and humidity-only baseline | contracts |
| 9 | training_data | synthetic_data | edit | P0 | Generate seeded synthetic parchment batches with documented label rule and farm split | weather, features |
| 10 | train_export | train_export | edit | P0 | Train depth-4 tree and export tree.json | synthetic_data |
| 11 | inference | inference | edit | P0 | JS tree interpreter with Python and Node parity and size check | train_export, features |
| 12 | ui_core | pwa_screens | edit | P0 | PWA screens: batch list, tap-only check form and result view at 360 px | contracts, scaffold |
| 13 | ui_sim | result_view | edit | P0 | Result view: local-language message, reasons, audio, SMS draft and evidence screen | pwa_screens, messages |
| 14 | integration | offline_flow | edit | P0 | End-to-end offline flow on a real phone | inference, result_view, device_records, bands_baseline, weather |
| 15 | evaluation | evaluation | edit | P0 | Held-out evaluation: tree against humidity baseline | train_export, bands_baseline, synthetic_data |
| 16 | reliability | test_gate | edit | P0 | Test gate: leakage, determinism, parity and size | inference, synthetic_data |
| 17 | offline_mobile | deploy_offline | edit | P0 | Deploy the static app and verify airplane-mode reload on a real phone | offline_flow |
| 18 | release | release | edit | P0 | README, data limits, Responsible AI section and submission | coordination, evaluation, test_gate, deploy_offline, video |
| 19 | audio | messages | edit | P0 | Local-language message set (text required, audio optional) | contracts, coordination |
| 20 | baseline_plus | baseline_plus | close, not planned | | | |
| 21 | economics | economics | close, not planned | | | |
| 22 | interventions | interventions | close, not planned | | | |
| new | | video | create | P0 | Record the 2 to 5 minute submission video | offline_flow, evaluation |

Closing comment for #7, #20, #21, #22: "Closed as not planned under Spec v2 (docs/SankofaFresh_Spec_v2.md). v2 removes the server API, the extra comparator and the economic and intervention work."

## Scope and acceptance per issue

Write each issue body with the same sections as v1 (Context, Priority, Dependencies, Scope and implementation notes, Acceptance criteria, Required evidence, Implementation notes). Context links to `docs/SankofaFresh_Spec_v2.md` and names the spec sections. Keep estimates short and honest; the team has roughly 18 working hours.

**#1 coordination.** Confirm in the Hack-Nation workspace: exact deadline and timezone, submission form fields, one video or three. Choose the local language and demo location together (spec 13). Decide repo visibility for judges and the static host. Record prior concept disclosure. AC: each answer recorded with source and time, or marked unresolved. Spec 13.

**#2 contracts.** Freeze spec 5.1 to 5.5 as `docs/contracts_v2.md` plus JSON fixtures: three demo batches (safe, rewetted in dry weeks, missing input), one out-of-range input, a two-node sample tree.json, and an English message file with every key. AC: feature order and encodings identical everywhere; every message key present. Spec 5.

**#3 scaffold.** Create the spec 8 layout, `requirements.txt` with pinned versions, `.gitignore`, and a CI workflow that runs pytest and the Node parity test when they exist. No frontend framework or build step. AC: clean venv installs; CI runs on PRs without secrets. Spec 8.

**#4 device_records.** localStorage wrapper for batches and actions, wrapped in try/catch; consent screen on first run; delete-all in settings. AC11. Spec 3, 11.

**#5 weather.** `data/fetch_power.py` (hourly T2M, RH2M, community AG, `--lat --lon --year`) and `data/build_weather.py` writing `web/weather.json` with daily means and 14-day features. Record the request URL and the POWER citation in the README. Coordinates come from #1; the script must not hard-code them. AC: weather.json under 100 KB; values in plausible ranges. Spec 5.2, 10.

**#6 features.** One encoding function in Python and one in JS that produce identical vectors for the fixtures; abstention rules 1 and 2 from spec 5.3. AC01 (inputs part). Spec 5.2, 5.3.

**#8 bands_baseline.** Map class probabilities to green, amber, red; apply the abstain cut (rule 3); implement the humidity-only baseline from spec 7 in Python for evaluation. Remove v1 hysteresis, cooldown and SQLite state. AC01. Spec 5.3, 7.

**#9 synthetic_data.** `data/gen_batches.py` and `data/generator_config.json` exactly as spec 6, every parameter carrying a `source` field. Farm-level 60/20/20 split plus a season-held-out stress set. Manifest with seed, counts per class and split. AC02, AC03. Spec 6.

**#10 train_export.** `model/train.py`: DecisionTreeClassifier(max_depth=4, class_weight="balanced"); tune the abstain cut on validation only; export tree.json per spec 5.4 with feature ranges and sha256. AC05 (tree part). Spec 5.4, 6.

**#11 inference.** `web/tree.js` interpreter using `Math.fround`; `tests/test_parity.mjs` comparing JS against Python predictions on every held-out row plus threshold boundary cases; `tests/test_size.py`. AC04, AC05. Spec 5.4.

**#12 pwa_screens.** Batch list, tap-only check form with "Don't know" on every question, result screen shell, settings. 360 px, 44 px targets, text and icons for status. Works against #2 fixtures before the model exists. AC08. Spec 3, 4.

**#13 result_view.** Render band, up to two reasons from the decision path, one action, Play audio button if clips exist, SYNTHETIC_DEMO label, SMS draft labelled SIMULATED_NOT_SENT with a copy button, and the evidence screen reading evidence/metrics.json (shows "Not evaluated" when absent). AC09, AC12. Spec 4, 5.5.

**#14 offline_flow.** Wire everything: form, features, tree, bands, messages, records. Run the three demo batches end to end on a real phone. This is the 19:00 ET team checkpoint. AC01, AC06 (first pass). Spec 3.

**#15 evaluation.** Tree and baseline on the same held-out farms with the spec 7 metrics, written to evidence/metrics.json, plus the rewetted-in-dry-weeks case. Report weaker results honestly. AC10. Spec 7.

**#16 test_gate.** Leakage, determinism, parity and size tests all green in CI. AC02 to AC05. Spec 9.

**#17 deploy_offline.** Service worker pre-caches every file; deploy to the static host chosen in #1; open once, switch to airplane mode, reload, run a check. Record it and fill `evidence/offline-check.md` and the network log. AC06, AC07. Spec 4, 9.

**#18 release.** README: problem sentence, how to run and test offline, dataset table, data limits list (spec 10), tree paths, metrics, Responsible AI (spec 11), claims (spec 12), licences. Claims review. Submit. AC12, AC13. Spec 10 to 12.

**#19 messages.** All keys from spec 5.5 in English and the chosen language, checked by a fluent speaker; optional audio clips with source and licence recorded per clip. If audio isn't working by 21:00 ET, ship text only. AC09. Spec 5.5.

**video (new).** Script and record one 2 to 5 minute video covering the five required parts: the problem sentence, the AI and why a simpler tool would not do the same job (with guardrails), the demo (airplane mode, three batches, not_sure moment, SMS draft), where it sits in the user's week plus tech stack, and the team's take on localizing AI. Export short cuts if the form asks for more than one video. Rough cut by 05:00 ET. Spec 1, 7, 11.
