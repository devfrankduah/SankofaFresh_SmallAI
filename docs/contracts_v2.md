# v2 contracts

This document explains `web/contract.json` and the `tree.json` format. It covers [Spec v2](SankofaFresh_Spec_v2.md) sections 5.1 to 5.5, and where the two disagree, the spec wins.

## One source of truth

`web/contract.json` is the only place that defines input fields, allowed values, feature order, encodings, class names, band names, abstention rules and message keys. The Python tooling (data generation, training, evaluation) and the JavaScript app both read it at runtime. No other file may hard-code feature order or encodings. If a value has to change, change it in `contract.json` and let `tests/test_contract.py` show what else needs updating. That test checks the contract against the spec text itself, so the two can't drift apart without a failure.

The file lives in `web/` because the app loads it, and the service worker caches it with everything else.

Two modules implement it: `model/contract.py` for Python and `web/features.js` for the browser. Both turn answers into the feature vector and apply abstention rules 1 and 2. `tests/test_encode.py` and `tests/test_encode_parity.mjs` hold them to the same expected values, so they can't drift apart.

## Inputs

`inputs` lists the eight answers from spec 5.1, in form order. The form asks seven of them: `askedInputs` in `web/app.js` leaves out `weather_window.days_input` (`days_stored`), and `withComputedDays` fills it in as the days from `start_input` (`storage_start`, the bagging date) to today, or `dont_know` when the date is "Don't know". Each input has a `type`:

- `choice`: the answer must be one of `values`.
- `integer`: a whole number from `min` to `max`, both inclusive. JSON has one number type, so `12.0` counts as 12; `12.5`, `true` and `"12"` are not allowed.
- `date`: a real calendar date written `YYYY-MM-DD` in ASCII digits, from year 0001 to 9999.

The answers must be an object with exactly these eight fields. A missing field, an extra field, or anything that isn't an object counts as an input the contract doesn't allow (rule 2).

"Don't know" is stored as the string in `dont_know_value` (`dont_know`), never as a missing field, null or zero. Every question allows it (`allows_dont_know: true`) because spec section 3 says every question has a "Don't know" option. The one exception is `batch_label`: it names the batch when the farmer adds it, so it isn't an answer about the coffee.

`batch_label` is picked from ten fixed labels, "Batch 1" to "Batch 10", so there is no free text. Ten is our assumption for a smallholder household; raise it here if that turns out too few.

## Features

`features` lists the nine model features from spec 5.2. Their order in the array is the order of the model's input vector, and both languages build the vector by walking this array. A feature either comes from an input (`source: input`) or from the bundled weather (`source: weather`).

- `encoding: integer` copies the input number unchanged.
- `encoding: map` replaces the input value with the number in `map`, for example `no` becomes 0 and `yes` becomes 1.
- Weather features name the NASA POWER variable (`RH2M` or `T2M`), how it is aggregated over the window, and its unit.

Each feature also names the message key used when that feature is a reason for the result (spec 5.5), and its `risk` direction: `higher` means larger values push toward a riskier result, `lower` means smaller values do. `days_drying` is the only `lower` feature, because fewer drying days means wetter parchment in the spec 6 model; its reason is `reason_short_drying`. `t14_mean` has no reason key, because spec 5.5 defines none for it, so its `risk` is `null`. A split on the decision path supports a reason only when the sample went the risky way: right of the threshold (`x > threshold`) for a `higher` feature, left (`x <= threshold`) for a `lower` one.

### Weather window

`weather_window` says how the three weather features are computed, and both encoders read every name from it:

1. The check date is `start_input` (`storage_start`) plus `days_input` (`days_stored`) days. If that falls after 9999-12-31, the input is out of range.
2. The window is the 14 days ending on the check date, including it.
3. `web/weather.json` (built in #5) holds one bundled year as a `days` list with 365 or 366 rows. Row `n` has `day_of_year` equal to `n` and the daily means `rh2m_mean` and `t2m_mean` (the `columns` map). The check date's day of year picks the last row of the window, and the window takes the 13 rows before it, wrapping from row 1 back to the last row. Any year maps this way, so 31 December of a leap year (day 366) lands on row 1 of a 365-day table, one day off, which is within the spec's "same calendar weeks" proxy.
4. `rh14_mean` and `t14_mean` are the mean of the daily means (`aggregate: mean`), and `rh14_max` is the largest daily mean (`aggregate: max`).

Both encoders add the 14 values one by one, oldest first, and divide by 14. That fixed order keeps Python and JavaScript identical to the last bit; `math.fsum` or numpy would round differently. A malformed weather table is a build error and raises; it never becomes a not_sure result.

## Classes and bands

`classes` (`green`, `amber`, `red`) are the tree's outputs. Every probability array in `tree.json` follows this order. `bands` adds `not_sure`, the abstention result, and maps each band to its message key.

## Abstention

`abstention.rules` are spec 5.3's three rules. Check them in the order listed; the first one that holds gives `not_sure` with that rule's single reason, and nothing after it runs:

1. `dont_know`: any input is `dont_know`. No feature vector is built.
2. `out_of_range`: any input the contract doesn't allow (outside `min` and `max`, a value not in `values`, the wrong type, or an impossible date), or any feature outside `feature_ranges` in `tree.json`. Ranges are inclusive and compared as ordinary 64-bit numbers. Treating contract violations as out of range is our addition: a tap-only form shouldn't produce them, but corrupted storage could, and the fail-safe answer is not_sure rather than a crash.
3. `low_confidence`: the winning class probability at the leaf is below `abstain_cut` from `tree.json`. A probability exactly equal to the cut is not below it, so it returns the band. `default_abstain_cut` (0.6) is the starting value; the tuned value always comes from `tree.json`.

The winning class is the first class with the highest probability, in `classes` order, the same tie rule as numpy `argmax` and scikit-learn `predict`. `web/tree.js` (`predict`) and `model/bands.py` (`band`) both follow it, and the parity test holds them to each other.

The humidity-only baseline (spec 7, `model/bands.py`) says red when `rh14_mean` is above 80 and green otherwise. It is used only in evaluation, never in the app.

## Actions

`actions` is the spec 5.6 rule for the single action on a result. If the first reason shown is a key in `reason_action`, that action is shown. Otherwise `band_default` decides: amber, red and not_sure show `action_test_sample`, and green shows nothing (`null`). Green results show no reasons, because every reason message describes a risk, so green never picks up an action from the map. A not_sure result's only reason is its abstention reason, which is not in the map, so not_sure always shows `action_test_sample`.

`recorded_actions` are the values stored when the farmer records what they did (spec 3, step 5). Recording an action never changes the result.

## Messages

`languages` lists the shipped language codes in order; the first is the default. Each code has a file `web/messages.<code>.json`, and every listed file must contain exactly the keys in `message_keys`, the full list from spec 5.5. A file with a top-level `_status` field is a draft and must not be listed. A new language starts as `web/messages.<code>.draft.json` with `_status`; a fluent speaker checks every string, then the file loses `_status`, is renamed `messages.<code>.json`, and the code is added to `languages`. Twi (`tw`) went through this: machine-drafted, approved unchanged by one fluent speaker on the team, and listed after English. They come in two groups: result messages, and interface strings for the screens. Interface keys follow fixed patterns so the app can find them without a lookup table:

- `question_<input>` for each input in `inputs`.
- `option_<value>` for each choice value except batch labels, plus `option_dont_know`.
- `record_<value>` for each value in `recorded_actions`.
- `button_*` and `title_*` for buttons and screen titles.
- `error_*` for problems the app reports, `evidence_*` and `source_*` for the evidence screen, and `metric_<name>` for each name in `metrics`.
- `language_name` is the language's own name for itself, shown in the language toggle.

`message_placeholders` lists the placeholders each message may contain, written `{name}`. `sms_template` has `{batch_label}`; `weather_note` and `source_weather` have `{year}`, the bundled weather year; and `weather_strip`, the screen-reader text for the 14-day humidity line on About this check, has `{low}` and `{high}`, which the app fills with formatted percentages such as "62%"; and `summary_line` has `{count}` and `{total}`, the batches needing a check (amber, red or not sure) and all batches; and `weather_days`, the screen-reader text for the result screen's 14-day weather row, has `{wet}`, the number of those days (0 to 14) whose mean humidity in the bundled year is above 80%. Translators must keep every placeholder unchanged but may reorder them. Interface strings (`question_`, `option_`, `button_`, `record_`, `title_`, `error_`, `evidence_`, `source_`, `metric_` and `nav_` keys, plus `sms_not_sent` and `demo_model_note`) stay at 40 characters or fewer, so they fit a 360 px screen and are quick to translate.

No message shows an internal identifier: `SYNTHETIC_DEMO` stays in `evidence_mode` and the evidence files, and `SIMULATED_NOT_SENT` stays in the docs. On screen, `synthetic_label` ("Practice result: this check learned from made-up examples, not from real farms.") marks every result as practice, and `sms_not_sent` ("Not sent. You decide whether to send it.") labels the SMS draft. `tests/test_contract.py` rejects any message containing a capitalised identifier with an underscore.

The band messages copy the wording in spec section 1. Batch labels ("Batch 1" to "Batch 10") are stored values and are shown as stored; they have no message key. `sms_copied` ("Copied") confirms that the SMS draft was copied.

**The documented exceptions:** the reload button on the app's error screen may use the hard-coded aria-label "Reload", and that screen's page title may be the hard-coded app name "SankofaFresh". That screen can appear because the message files themselves failed to load, so there may be no message to read the label or title from. Every other visible or spoken string comes from the message files.

## tree.json

`model/train.py` (#10) writes `web/tree.json`. Its fields:

| Field | Meaning |
|---|---|
| `schema_version` | 2 |
| `model_version` | `tree-v2-` followed by the first 7 characters of `sha256`, so the same tree always has the same version |
| `evidence_mode` | `SYNTHETIC_DEMO` |
| `feature_names` | the contract feature names, in contract order |
| `feature_ranges` | for every feature, `[min, max]` seen in training, inclusive |
| `classes` | the contract classes, in contract order |
| `abstain_cut` | the tuned cut for rule 3, between 0 and 1 |
| `nodes` | the tree, described below |
| `sha256` | the hash of `nodes`, described below |
| `training` | provenance written by `model/train.py`: seed, dataset sha256, depth, class weighting, training rows and scikit-learn version. The app ignores it. |

`nodes` is an array where each node's `id` equals its position and node 0 is the root. A split node has `feature` (an index into `feature_names`), `threshold`, `left` and `right`. A leaf has only `id` and `value`, the class probabilities in `classes` order, which sum to 1. Every node is reachable from the root exactly once.

### Threshold rule

A sample goes left when `x <= threshold`, and right otherwise. Inputs are cast to 32-bit floats before comparing: `np.float32(x)` in Python and `Math.fround(x)` in JavaScript. Thresholds are exported exactly as scikit-learn stores them and must not be rounded. scikit-learn compares 32-bit inputs, but it stores each threshold as a 64-bit number halfway between two 32-bit values (for example 0.44999999552965164, which isn't itself a 32-bit value). Rounding a threshold to 32 bits would change results at the boundary. Python's `json.dumps` writes these numbers so they read back exactly, and so does `JSON.parse`.

### Hash

```python
hashlib.sha256(json.dumps(nodes, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
```

The app verifies this hash in JavaScript before it trusts the tree, and refuses the tree if it doesn't match. It needs the exact string Python hashed, which `JSON.stringify` doesn't give: it doesn't sort keys, and it writes the float `1.0` as `1` and `0.00001` as `1e-5`, where Python writes `1.0` and `1e-05`. `web/canonical.js` exports `canonicalNodes(nodes)`, which rebuilds Python's string:

- keys sorted, no spaces, `,` between items and `:` after keys;
- `id`, `feature`, `left` and `right` written as integers;
- `threshold` and every `value` entry written as Python `repr()` writes a float: the same shortest digits as JavaScript, always with a `.0` or a fraction, and in exponent form (`1e-05`, `1.5e+16`) below 0.0001 or from 10 to the 16th up.

The export (#10) writes those fields as floats even when they are whole numbers, so the rule holds. Hash the result as UTF-8 with SHA-256 (`crypto.subtle.digest` in the browser). `tests/fixtures/canonical_nodes.json` holds Python's output for awkward nodes and 1,000 floats, and `tests/test_canonical.mjs` checks `web/canonical.js` against it.

## web/metrics.json

The evidence screen reads `web/metrics.json`, which the evaluation (#15) writes:

```json
{
  "model_version": "tree-v2-1a2b3c4",
  "tree_sha256": "<the sha256 in tree.json>",
  "tree": {"accuracy": 0.91, "macro_f1": 0.88, "red_recall": 0.93, "false_reassurance_rate": 0.01, "abstain_rate": 0.07, "coverage": 0.93},
  "baseline": {"accuracy": 0.55, "macro_f1": 0.40, "red_recall": 0.80, "false_reassurance_rate": 0.20, "abstain_rate": 0.0, "coverage": 1.0}
}
```

The numbers above are placeholders, not results. The metric names are the `metrics` list in the contract, each a share from 0 to 1, computed on the held-out synthetic farms. A missing file, a missing metric or `null` shows `not_evaluated` ("Not evaluated"), never zero. If `tree_sha256` doesn't match the loaded tree, the screen shows `not_evaluated` for the tree, because the numbers describe a different model. `evidence/metrics.json` holds the full detail (definitions, confusion matrices, the season stress set) and is not shipped in the app.

## Audio

Audio is optional (spec 5.5). Clips live at `web/audio/<lang>/<key>.mp3`, one per message key, and `web/audio/index.json` lists which keys have a clip in each language:

```json
{"en": ["band_green", "band_amber"], "tw": ["band_green"]}
```

The app shows the Play button only for keys listed there. A missing `index.json`, or a language or key not in it, means no audio, and the text still shows. Each clip's source and licence are recorded in the messages issue (#19).

## Icon vocabulary

Every picture stands for one thing and means the same on every screen, so the app can be followed by someone who does not read. Pictures are inline SVG symbols in `web/index.html` (`i-<name>`). A picture that only decorates is left out. `tests/result.test.mjs` fails when a symbol is drawn but missing from this table, or listed here but not drawn.

| Picture | Stands for | Where |
|---|---|---|
| `sankofa` | SankofaFresh itself | Welcome mark, batch list header, How it works in Settings |
| `home` | The batch list | Header of every screen except the welcome |
| `back` | Back one screen | Header, Back in the form |
| `settings` | Settings | Batch list header |
| `action` (arrow) | Go on to the next step | Continue on the welcome and in the form |
| `check` (tick) | Yes, or done | The Yes answer, answered steps, the chosen tile, finishing the form, Copied |
| `reload` | Check this batch again | Check on a result, reload after an error |
| `plus` | Add one | Add batch, the day stepper |
| `minus` | Take one away | The day stepper |
| `alert` | Needs attention | The needs-check count, a missing answer, a date after today, notices |
| `question` | Don't know | The Don't know answer, the reason that one question was answered Don't know |
| `language` | Language | Language tiles, the language choice in Settings |
| `sack` | A batch | A result's batch, the empty list, the batch question, How it works step 1 |
| `sun` | Drying, or dry | The days-dried question, the short-drying reason, the Dry answer, a day of drying air |
| `humid` (drop) | Damp | The Damp answer, the humid-weeks reason, a day of very damp air |
| `rain` | Got wet | The got-wet question and reason |
| `hand` | The hand or bite test | The hand-test question and reason |
| `smell` (nose) | Smell | The musty-smell question and reason |
| `floor` | Bags on the floor | The On the floor answer and reason |
| `raised` (pallet) | Bags raised off the floor | The where-are-the-bags question, the Raised answer, the raise-the-bags action |
| `storage` (calendar) | Dates and time in storage | The bagging-date question, the long-storage reason |
| `half` | Unsure | The Unsure answer to the hand test |
| `cross` | No | The No answer |
| `range` | An answer outside what the check was built for | The out-of-range reason |
| `scale` | The check cannot tell | The low-confidence reason |
| `reason` (magnifier) | A reason with no picture of its own | Fallback only: every reason in this contract has its own |
| `redry` | Dry it again | The re-dry action |
| `carry` | Take a sample to the cooperative | The take-a-sample action |
| `weather` (phone and cloud) | The check uses the usual weather | How it works step 2 |
| `stamp` | A result | How it works step 3 |
| `band-green`, `band-amber`, `band-red`, `band-not_sure` | The four results | The stamp on a result and on each batch row |
| `pending` | Not checked yet | A batch row with no result |
| `offline` (no-signal bars) | Works with no signal | The welcome chip |
| `play` | Hear it | Play on a result and on a form question |
| `copy` | Copy the SMS | Copy SMS |
| `message` | The SMS draft | The SMS label |
| `record` | Record what you did | Record what you did |
| `trash` | Delete | Delete all in Settings |
| `demo` (flask) | Demo data | Load demo batches, on the empty list and in Settings. The demo labels carry text only |
| `evidence` (bars) | About this check | The link under each result, Settings |

## Fixtures

`tests/fixtures/` holds shared test data for the features (#6), bands (#8), inference (#11) and screens (#12) work. Both encoders must reproduce every expected value exactly.

- `weather_sample.json`: a synthetic weather table in the `weather.json` format, with two wet and two dry seasons. It is test data, not NASA POWER data.
- `weather_ramp.json`: a synthetic table where `rh2m_mean` is the day of year and `t2m_mean` a quarter of it, so window sums can be checked by hand.
- `demo_batches.json`: the three demo batches from spec section 7 (clearly safe; rewetted during drying then stored in dry weeks; a "Don't know" answer), computed against `weather_sample.json`. Each case gives its inputs and expected results: the abstention reason or none, the feature vector in contract order (none when abstaining), and the humidity-only baseline band (none when abstaining).
- `out_of_range.json`: one batch with `days_stored` of 240, above the contract's 180. It returns not_sure with `reason_out_of_range`.
- `encode_cases.json`: edge cases for both encoders, such as whole-number floats, booleans, impossible dates, two-digit years, a check date past 9999, missing or extra fields, rule 1 winning over rule 2, tree ranges including their edges, and ramp-table windows that wrap at New Year and on leap days. The ramp cases' expected weather values were computed with exact fractions, separately from either encoder.
- `sample_tree.json`: a three-node `tree.json` (one split on `rh14_mean` at 80.5, two leaves) with a correct hash. Its right leaf's winning probability is exactly 0.6, the abstain cut, which is a ready-made boundary case for rule 3.
