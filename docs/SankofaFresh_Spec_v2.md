# SankofaFresh Small AI: Specification v2

Version 2.0 | 3 October 2026 | Status: specification agreed by the team, software not yet built

Supersedes `docs/SankofaFresh_Project_Specification.md` (v1, tomato storage hub). v1 is kept unchanged as history. Where the two differ, this document wins.

Track: Hack-Nation 7th Global AI Hackathon, Challenge 04, Small AI for Development (World Bank Youth Summit), Agriculture sector, Annex B.

## 1. What we are building

An offline phone web app (PWA) that helps a smallholder coffee farmer decide what to do with stored coffee parchment before she sells it: keep it, re-dry it, move it off the floor, or take a sample to the cooperative's moisture meter first.

The household opens the app on the smartphone it already has. The farmer answers a few tap-only questions about each batch. A small decision tree that runs inside the browser combines those answers with bundled local humidity data and returns one of four results, read out in a named local language:

| Band | Meaning shown to the user |
|---|---|
| green | No warning signs in this check. Keep storing as you are. |
| amber | Check this batch soon. |
| red | Check this batch before selling it. Take a sample to the cooperative. |
| not_sure | Not sure. Ask a person at the cooperative. |

The app never sells, never sends a message and never contacts anyone. It drafts an SMS the user can choose to send from her own phone.

### Why this fits the brief

The persona (Noor) grows coffee and sells parchment to whichever buyer arrives, at a price she can't check. Coffee that is too wet when stored or sold loses quality and price. FAO guidance sets 12 percent moisture (wet basis) as the recommended maximum for dry parchment, and the Codex code of practice puts the safe level for parchment below 12.5 percent. Noor has no moisture meter at home, so she needs a cheap way to decide which batch is worth checking before the buyer comes.

### Rules of the track and how v2 meets them

| Rule | How v2 meets it |
|---|---|
| Runs on a device the user already has | Runs in the browser of the household smartphone. No laptop, no server. |
| Core feature works offline | Service worker caches every file on first load. Checks, results and audio work in airplane mode. |
| Model small enough to side-load | The tree is a JSON file of a few KB. Whole app target under 1 MB, measured and reported. |
| At least one local-language interaction | Every result, reason and action is a fixed message in the chosen language (text required, audio optional). |
| Human in the loop | Results inform; a person decides. Red and not_sure always name a person and a physical check. |
| Avoid hallucinations | Nothing is generated at runtime. Every output comes from a fixed list of human-checked messages. |
| Fail-safe (pass/fail) | The not_sure band triggers on missing inputs, out-of-range inputs and low tree confidence. |

## 2. Frozen scope

| Item | Decision |
|---|---|
| Sector | Agriculture |
| Crop and product | Coffee parchment in storage |
| User | Smallholder farmer household, shared smartphone used mostly at weekends |
| Delivery | Static PWA: HTML, CSS, vanilla JavaScript, service worker, web manifest |
| Model | scikit-learn DecisionTreeClassifier, max_depth 4, exported to JSON, run by a small JS interpreter |
| Training tooling | Python, offline, team only. Never runs on the user's device. |
| Weather data | NASA POWER hourly T2M and RH2M for one demo location, bundled as a small JSON |
| Labels | Synthetic, generated from a documented rule tied to FAO and Codex thresholds. Evidence mode SYNTHETIC_DEMO. |
| Storage on device | Browser localStorage only. No accounts, no names, no phone numbers, no GPS. |
| SMS | Draft only, labelled SIMULATED_NOT_SENT, with a copy button |
| Hosting for judges | Static host link. The app must still work offline after the first load. |

### Removed from v1

FastAPI, SQLite, the laptop server, LAN phone access, restart persistence, atomic steps, the simulation clock, simulated temperature sensors, the tomato deterioration formula, hysteresis and cooldown tuning, the economic calculator and intervention branches. Do not add them back.

## 3. User workflow

1. First run: a consent screen in the local language explains that records stay on the phone and nothing is sent unless the user sends the SMS herself. The user taps to continue.
2. Batch list: shows saved batches with their last band, the date of the last check, and an Add batch button.
3. Check form (tap-only, no typing): the questions in section 5.1. Every question has a "Don't know" option.
4. Result: the band with icon and text, up to two reasons, one action, a Play button for audio, the SYNTHETIC_DEMO label, and the SMS draft.
5. Record what was done: re-dried, moved off the floor, took a sample, sold, other. Recording an action does not change the result.
6. Settings: language toggle (local language and English), delete all records.

Where it sits in the week: the smartphone is home at weekends. On Saturday the household checks its stored batches. During the week, the basic phone carries the SMS conversation with the cooperative or extension officer.

## 4. Screens and interface acceptance

Three main screens (batch list, check form, result) plus consent and settings.

- No horizontal scroll at 360 px width.
- Tap targets at least 44 by 44 CSS pixels.
- Status uses text and an icon, never colour alone.
- The SYNTHETIC_DEMO label is visible on every result and on the evidence screen.
- No external fonts, scripts, CDNs or network calls after install.
- Evidence screen: model version, tree hash, file sizes, held-out metrics against the baseline, data sources. Metrics not yet computed show "Not evaluated", never zero.

## 5. Data contracts

### 5.1 Inputs collected in the app

| Field | Values | Notes |
|---|---|---|
| batch_label | short label picked from a list (Batch 1, Batch 2, ...) | No free text |
| days_drying | 0 to 30 | Days the parchment spent drying |
| rewetted | yes, no, don't know | Rained on or got wet after drying started |
| storage_surface | floor, raised, don't know | Raised means pallet, platform or rack |
| musty_smell | yes, no, don't know | |
| dryness_check | dry, unsure, damp, don't know | The farmer's usual hand or bite test |
| days_stored | 0 to 180 | Days since bagging |
| storage_start | date | Used to look up the bundled weather window |

### 5.2 Model features (identical order and encoding in Python and JS)

| # | Feature | Encoding |
|---|---|---|
| 0 | days_drying | integer |
| 1 | rewetted | 0 no, 1 yes |
| 2 | floor | 0 raised, 1 floor |
| 3 | musty | 0 no, 1 yes |
| 4 | dryness_check | 0 dry, 1 unsure, 2 damp |
| 5 | days_stored | integer |
| 6 | rh14_mean | mean of daily mean RH2M over the 14 days ending on the check date, percent |
| 7 | rh14_max | max daily mean RH2M over those 14 days, percent |
| 8 | t14_mean | mean of daily mean T2M over those 14 days, degrees C |

Weather features come from the bundled table, which holds one row of daily means per day of the year. The check date is storage_start plus days_stored, and the window is the 14 days ending on it, mapped onto the bundled year by day of year and wrapping at the year boundary. The demo uses the bundled year's values for the same calendar weeks as a proxy, and the UI says so ("typical humidity for these weeks, NASA POWER <year>"). In a real deployment the table would refresh whenever the phone has data.

### 5.3 Abstention rules (the not_sure band)

Return not_sure, with the reason, when any of these hold:

1. Any input in 5.1 is "don't know".
2. Any feature is outside the range seen in training (ranges are stored in `tree.json`).
3. The winning class probability at the leaf is below the abstain cut. Start at 0.6; tune on validation only.

### 5.4 tree.json

```json
{
  "schema_version": 2,
  "model_version": "tree-v2-<shortsha>",
  "evidence_mode": "SYNTHETIC_DEMO",
  "feature_names": ["days_drying", "rewetted", "floor", "musty", "dryness_check", "days_stored", "rh14_mean", "rh14_max", "t14_mean"],
  "feature_ranges": {"days_drying": [0, 30]},
  "classes": ["green", "amber", "red"],
  "abstain_cut": 0.6,
  "nodes": [
    {"id": 0, "feature": 6, "threshold": 80.5, "left": 1, "right": 2},
    {"id": 1, "value": [0.8, 0.15, 0.05]},
    {"id": 2, "value": [0.1, 0.3, 0.6]}
  ],
  "sha256": "<hash of the canonical nodes array>"
}
```

scikit-learn sends a sample left when `x <= threshold`. It compares inputs as float32, but stores each threshold as a float64 midpoint between two float32 values, so thresholds must be exported exactly as stored and never rounded to float32. The JS interpreter must cast inputs with `Math.fround` before comparing, so Python and JS give identical results at threshold boundaries.

### 5.5 Message set

One JSON file per language, `web/messages.<lang>.json`, with the same keys. The languages list in `web/contract.json` names the shipped languages; the first is the default.

Results: `band_green`, `band_amber`, `band_red`, `band_not_sure`, `reason_rewetted`, `reason_short_drying`, `reason_damp_check`, `reason_humid_weeks`, `reason_floor`, `reason_musty`, `reason_long_storage`, `reason_missing_input`, `reason_out_of_range`, `reason_low_confidence`, `action_test_sample`, `action_redry`, `action_raise_bags`, `consent_text`, `sms_template`, `synthetic_label`.

Interface: `question_batch_label`, `question_days_drying`, `question_rewetted`, `question_storage_surface`, `question_musty_smell`, `question_dryness_check`, `question_days_stored`, `question_storage_start`, `option_yes`, `option_no`, `option_dont_know`, `option_floor`, `option_raised`, `option_dry`, `option_unsure`, `option_damp`, `button_add_batch`, `button_check`, `button_play`, `button_copy_sms`, `button_record_action`, `button_delete_all`, `button_continue`, `record_redried`, `record_moved_off_floor`, `record_took_sample`, `record_sold`, `record_other`, `title_consent`, `title_batches`, `title_check`, `title_result`, `title_settings`, `title_evidence`, `weather_note`, `not_evaluated`, `language_name`, `confirm_delete_all`, `sms_not_sent`, `demo_model_note`, `error_storage`, `error_model_check`, `error_files`, `evidence_model_version`, `evidence_tree_hash`, `evidence_file_sizes`, `evidence_metrics`, `evidence_tree`, `evidence_baseline`, `evidence_sources`, `source_weather`, `source_labels`, `metric_accuracy`, `metric_macro_f1`, `metric_red_recall`, `metric_false_reassurance_rate`, `metric_abstain_rate`, `metric_coverage`.

Placeholders in braces, {batch_label} in the SMS template and {year} in the weather note and weather source line, are filled in by the app and must be kept unchanged in every language. Keep interface strings short: each one is translated and checked by a person.

Reasons are picked from the features on the decision path that pushed toward the result. They describe what the tree used, not a proven cause.

A fluent speaker checks every message in the local language. Audio, if included, is one short clip per key, generated at build time or recorded by a person, and checked by ear. The app ships the audio files only, never a speech model.

### 5.6 Actions

Each result shows at most one action. If the first reason shown is the rewetted, damp check or short drying reason, the action is re-dry; if it is the floor reason, the action is raise the bags. Otherwise the band decides: amber, red and not_sure show take a sample to the moisture meter, and green shows no action. Green shows no reasons, because every reason message describes a risk. The red and not_sure band messages name the cooperative, so those results always name a person and a physical check. The rule lives in `web/contract.json` under `actions`.

## 6. Synthetic data generator

Purpose: teach the tree the documented risk logic. It is not field data and must never be described as field data.

Every parameter lives in `data/generator_config.json` with a `source` field: either a citation (FAO guidelines, Codex CAC/RCP 69-2009) or `ASSUMPTION`. Starting values, all to be replaced if a better source turns up:

1. Latent moisture after drying (percent, wet basis): `mc_dry = 16 - 0.5 * min(days_drying, 10) + noise(0, 0.8)`, plus 1.5 if rewetted. ASSUMPTION.
2. Equilibrium moisture in storage: `emc = 12 + 0.2 * (rh14_mean - 70)`, plus 1.0 if stored on the floor. ASSUMPTION, chosen so 70 percent RH sits near 12 percent moisture. Replace with a cited sorption curve if one is found.
3. Moisture now: `mc_now = mc_dry + (emc - mc_dry) * (1 - exp(-days_stored / 20))`. ASSUMPTION.
4. Label from latent moisture: green below 12.0 (FAO maximum for dry parchment), amber 12.0 to below 13.0 (the FAO and Codex boundary region), red at 13.0 or above (ASSUMPTION).
5. Observable proxies are drawn from the latent state with noise: dryness_check matches the true band about 70 percent of the time, says unsure about 20 percent and is wrong about 10 percent (ASSUMPTION); musty_smell probability rises with latent moisture (0.05 below 12, 0.25 from 12 to 13, 0.6 at 13 or above; ASSUMPTION).
6. Weather: each batch samples a storage window from the bundled NASA POWER year.
7. Farms: batches are grouped into synthetic farms, each with its own small drying offset. Split 60/20/20 by farm, never by row. A season-held-out set is an extra stress test.
8. "Don't know" values are never in training data. They exist only at runtime and always abstain.

Fixed seed. Same seed and config must produce a byte-identical dataset.

## 7. Baseline and evaluation

Baseline: red if rh14_mean is above 80 percent, otherwise green. The 80 percent figure comes from the ochratoxin A storage literature (little OTA at 80 percent RH, significant OTA at 87 and 95 percent).

Report on held-out farms, for both the tree and the baseline: accuracy, macro F1, red recall, false reassurance rate (true red predicted green), abstain rate and coverage. Report weaker tree results if that is what happens.

The demo case that shows why the tree matters: a batch that was rewetted during drying and then stored in a dry fortnight. The humidity-only baseline calls it green; the tree should not. Hand-build three demo batches (clearly safe, rewetted in dry weeks, missing input) for the video.

All metrics are labelled as results on synthetic labels. They show the tree recovers the documented risk logic better than a one-variable rule. They are not field accuracy.

## 8. Repository layout

```
data/
  fetch_power.py           # NASA POWER hourly fetch, --lat --lon --year
  build_weather.py         # derives daily and 14-day features, writes web/weather.json
  gen_batches.py           # seeded synthetic batches, writes data/batches.csv + manifest
  generator_config.json
model/
  train.py                 # farm split, tree, baseline, metrics, writes web/tree.json + evidence/metrics.json
tests/
  test_leakage.py          # no farm in two splits
  test_determinism.py      # same seed, same file hash, same tree hash
  test_parity.mjs          # Node runs web/tree.js on held-out rows; must match Python exactly
  test_size.py             # tree.json under 250 KB; reports total web/ size
web/
  index.html  app.js  tree.js  sw.js  manifest.webmanifest
  tree.json  weather.json  messages.en.json  messages.<lang>.json  audio/
evidence/
  metrics.json  sizes.json  offline-check.md
docs/
```

Python 3.11 or 3.12 with pinned versions in `requirements.txt` (numpy, pandas, scikit-learn, requests, pytest). Node 18 or later for the parity test only. No frontend framework and no build step.

## 9. Acceptance criteria

All are requirements, not achieved results, until evidence is attached.

| ID | Criterion | Evidence |
|---|---|---|
| AC01 | "Don't know", out-of-range input or low confidence returns not_sure with a reason | JS unit tests |
| AC02 | Same seed gives an identical dataset and tree hash | test_determinism |
| AC03 | No farm appears in more than one split | test_leakage |
| AC04 | Python and JS predictions match on all held-out rows, including threshold boundaries | test_parity |
| AC05 | tree.json under 250 KB; total app size measured and reported | test_size, evidence/sizes.json |
| AC06 | After one online load, the app works in airplane mode on a real phone, including a reload | Screen recording, offline-check.md |
| AC07 | No network requests at runtime after install | Browser devtools network log |
| AC08 | 360 px with no horizontal scroll; 44 px tap targets; status not by colour alone | Screenshot and checklist |
| AC09 | Every result comes from the fixed message set; local-language messages checked by a fluent speaker | Message file and reviewer note |
| AC10 | Tree and baseline compared on the same held-out farms with the metrics in section 7 | evidence/metrics.json |
| AC11 | Records stay on device; consent screen shown; delete clears everything | Manual check |
| AC12 | SYNTHETIC_DEMO on every result; no claims of field accuracy, food safety or income gains | Claims review |
| AC13 | A teammate can regenerate data, retrain and run the app from the README on a clean checkout | Clean-run log |

## 10. Data we cite and data we lack

Problem evidence (cite source, year and country in the README and video): FAO Guidelines for the Prevention of Mould Formation in Coffee; Codex CAC/RCP 69-2009; ILO Uganda coffee value chain mapping (2024); Arslan and co-authors, American Journal of Agricultural Economics (2024), Mount Elgon, Uganda; Uganda Ministry of Agriculture coffee price press brief (June 2025); World Bank "Small AI, Big Impact".

Data we build with: NASA POWER (cite as the POWER project asks), the synthetic batches (team-generated, labelled), the message set (team-written, speaker-checked), and audio clips (source and licence recorded per clip; Meta MMS-TTS is CC-BY-NC 4.0).

What our data does not cover (must appear in the README and the video):

- No real parchment moisture, water activity, mould or grade measurements. All labels are synthetic.
- No public dataset links smallholder storage conditions to parchment quality outcomes. That gap is the problem this tool starts on.
- NASA POWER is coarse gridded data. It doesn't capture conditions inside a house, a store or a bag.
- One location and one year of weather. No other regions, no robusta, no dry-processed cherry.
- No farmer registry, no real users and no field test.
- Price figures are national and dated, not live or local.
- Local-language messages are checked by one speaker; dialect variation isn't covered.

## 11. Responsible AI

- Human oversight: the tool informs; the farmer and the cooperative decide. Red and not_sure name a person and a physical check.
- Fail-safe: not_sure is a first-class result and is shown in the demo.
- No generated text at runtime; fixed messages only.
- Privacy: no account, name, number or location. Records stay in the browser. One-tap delete.
- Consent: first-run screen in the local language.
- Bias and limits: labels come from published thresholds, not from farmers' own batches; one weather grid cell; one speaker checked the language; the smartphone may belong to another household member, which is why the design is weekly.
- If this ever feeds a farmer registry, that must be opt-in, because farm-level records could weaken a farmer's position with buyers.

## 12. Claims

Allowed after tests pass: the app runs offline on the tested phone; the model is a measured number of KB; on held-out synthetic farms the tree scores the reported metrics against the baseline; results come only from the fixed message set.

Not allowed: reduced losses, higher income, food safety, real-world accuracy, real SMS delivery, or anything about Noor as a real person.

## 13. Open decisions (tracked in issue #1)

- Exact submission deadline, form fields and video format (one video or three).
- Local language and demo location, chosen together so they match. Proposal: a language the team can verify tonight and a coffee-growing location where it is spoken. Coordinates checked on a map before fetching weather.
- Repository visibility at submission. Judges need to read the code, and static hosting from a private repository may need a paid plan; use a public repository or a separate static host.
- Prior concept disclosure: SankofaFresh existed as an idea before the event. All code is written during the event window.

## 14. References

- FAO, Guidelines for the Prevention of Mould Formation in Coffee: https://www.fao.org/fileadmin/user_upload/agns/pdf/coffee/guidelines_final_en.pdf
- Codex Alimentarius, CAC/RCP 69-2009: https://www.fao.org/input/download/standards/11250/CXP_069e.pdf
- Conditions of formation of ochratoxin A in drying, transport and in different commodities, Food Additives and Contaminants: https://www.tandfonline.com/doi/full/10.1080/02652030500412154
- ILO, Mapping the coffee value chain in Uganda: https://www.ilo.org/sites/default/files/2024-07/Uganda_Coffee_Value_Chain_Mapping.pdf
- Arslan et al. (2024), American Journal of Agricultural Economics: https://onlinelibrary.wiley.com/doi/full/10.1111/ajae.12389
- Uganda Ministry of Agriculture, coffee price press brief (June 2025): https://www.agriculture.go.ug/wp-content/uploads/2025/06/Press-Brief-on-Coffee-Prices-001.pdf
- World Bank, Small AI, Big Impact: https://www.worldbank.org/en/topic/digital/brief/small-ai-big-impact
- NASA POWER hourly API: https://power.larc.nasa.gov/docs/services/api/temporal/hourly/
- Meta MMS-TTS: https://huggingface.co/facebook/mms-tts
