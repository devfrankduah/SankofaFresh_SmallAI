# v2 contracts

This document explains `web/contract.json` and the `tree.json` format. It covers [Spec v2](SankofaFresh_Spec_v2.md) sections 5.1 to 5.5, and where the two disagree, the spec wins.

## One source of truth

`web/contract.json` is the only place that defines input fields, allowed values, feature order, encodings, class names, band names, abstention rules and message keys. The Python tooling (data generation, training, evaluation) and the JavaScript app both read it at runtime. No other file may hard-code feature order or encodings. If a value has to change, change it in `contract.json` and let `tests/test_contract.py` show what else needs updating. That test checks the contract against the spec text itself, so the two can't drift apart without a failure.

The file lives in `web/` because the app loads it, and the service worker caches it with everything else.

## Inputs

`inputs` lists the eight answers from spec 5.1, in form order. Each has a `type`:

- `choice`: the answer must be one of `values`.
- `integer`: a whole number from `min` to `max`, both inclusive.
- `date`: a calendar date written `YYYY-MM-DD`.

"Don't know" is stored as the string in `dont_know_value` (`dont_know`), never as a missing field, null or zero. Every question allows it (`allows_dont_know: true`) because spec section 3 says every question has a "Don't know" option. The one exception is `batch_label`: it names the batch when the farmer adds it, so it isn't an answer about the coffee.

`batch_label` is picked from ten fixed labels, "Batch 1" to "Batch 10", so there is no free text. Ten is our assumption for a smallholder household; raise it here if that turns out too few.

## Features

`features` lists the nine model features from spec 5.2. Their order in the array is the order of the model's input vector, and both languages build the vector by walking this array. A feature either comes from an input (`source: input`) or from the bundled weather (`source: weather`).

- `encoding: integer` copies the input number unchanged.
- `encoding: map` replaces the input value with the number in `map`, for example `no` becomes 0 and `yes` becomes 1.
- Weather features name the NASA POWER variable (`RH2M` or `T2M`), how it is aggregated over the window, and its unit.

Each feature also names the message key used when that feature is a reason for the result (spec 5.5). `days_drying` and `t14_mean` have no reason key, because spec 5.5 defines none for them.

### Weather window

The spec says `storage_start` is used to look up the weather window, and that the window is the 14 days before the check. This contract joins the two: `check_date` is `storage_start` plus `days_stored` days, and the window is the 14 days before `check_date`, not including it. Training and the app therefore compute the same window from the same answers. How a date maps onto the single bundled weather year (for example 29 February, or a window that crosses New Year) is for the weather issue (#5) to define in `web/weather.json`, and both languages must then use that one mapping.

## Classes and bands

`classes` (`green`, `amber`, `red`) are the tree's outputs. Every probability array in `tree.json` follows this order. `bands` adds `not_sure`, the abstention result, and maps each band to its message key.

## Abstention

`abstention.rules` are spec 5.3's three rules. Check them in the order listed; the first one that holds gives `not_sure` with that rule's single reason, and nothing after it runs:

1. `dont_know`: any input is `dont_know`. No feature vector is built.
2. `out_of_range`: any input the contract doesn't allow (outside `min` and `max`, a value not in `values`, the wrong type, or an impossible date), or any feature outside `feature_ranges` in `tree.json`. Ranges are inclusive and compared as ordinary 64-bit numbers. Treating contract violations as out of range is our addition: a tap-only form shouldn't produce them, but corrupted storage could, and the fail-safe answer is not_sure rather than a crash.
3. `low_confidence`: the winning class probability at the leaf is below `abstain_cut` from `tree.json`. A probability exactly equal to the cut is not below it, so it returns the band. `default_abstain_cut` (0.6) is the starting value; the tuned value always comes from `tree.json`.

## Messages

`message_keys` is the full key list from spec 5.5. Every `web/messages.<lang>.json` file must contain exactly these keys. `message_placeholders` lists the placeholders each message may contain, written `{name}`. Only `sms_template` has one, `{batch_label}`, which the app replaces with the batch's label. Translators must keep placeholders unchanged.

The band messages copy the wording in spec section 1.

## tree.json

`model/train.py` (#10) writes `web/tree.json`. Its fields:

| Field | Meaning |
|---|---|
| `schema_version` | 2 |
| `model_version` | `tree-v2-` followed by the short commit hash of the training code |
| `evidence_mode` | `SYNTHETIC_DEMO` |
| `feature_names` | the contract feature names, in contract order |
| `feature_ranges` | for every feature, `[min, max]` seen in training, inclusive |
| `classes` | the contract classes, in contract order |
| `abstain_cut` | the tuned cut for rule 3, between 0 and 1 |
| `nodes` | the tree, described below |
| `sha256` | the hash of `nodes`, described below |

`nodes` is an array where each node's `id` equals its position and node 0 is the root. A split node has `feature` (an index into `feature_names`), `threshold`, `left` and `right`. A leaf has only `id` and `value`, the class probabilities in `classes` order, which sum to 1. Every node is reachable from the root exactly once.

### Threshold rule

A sample goes left when `x <= threshold`, and right otherwise. Inputs are cast to 32-bit floats before comparing: `np.float32(x)` in Python and `Math.fround(x)` in JavaScript. Thresholds are exported exactly as scikit-learn stores them and must not be rounded. scikit-learn compares 32-bit inputs, but it stores each threshold as a 64-bit number halfway between two 32-bit values (for example 0.44999999552965164, which isn't itself a 32-bit value). Rounding a threshold to 32 bits would change results at the boundary. Python's `json.dumps` writes these numbers so they read back exactly, and so does `JSON.parse`.

### Hash

```python
hashlib.sha256(json.dumps(nodes, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
```

The hash is computed in Python only. The app displays the stored `sha256` and does not recompute it. Recomputing it in JavaScript with `JSON.stringify` gives a different string: it doesn't sort keys, and it writes the float `1.0` as `1`, while Python writes `1.0`, and scikit-learn leaves often hold exactly 1.0.

## Fixtures

`tests/fixtures/` holds shared test data for the features (#6), bands (#8), inference (#11) and screens (#12) work. Weather values in the fixtures are illustrative, not NASA POWER data.

- `demo_batches.json`: the three demo batches from spec section 7 (clearly safe; rewetted during drying then stored in dry weeks; a "Don't know" answer). Each case gives its inputs, weather features and expected results: the abstention reason or none, the feature vector in contract order (none when abstaining), and the humidity-only baseline band.
- `out_of_range.json`: one batch with `days_stored` of 240, above the contract's 180. It returns not_sure with `reason_out_of_range`.
- `sample_tree.json`: a three-node `tree.json` (one split on `rh14_mean` at 80.5, two leaves) with a correct hash. Its right leaf's winning probability is exactly 0.6, the abstain cut, which is a ready-made boundary case for rule 3.
