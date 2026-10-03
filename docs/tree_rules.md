# Decision tree rules

Model `tree-v2-b7a4e1c`, sha256 `b7a4e1c115e6ab57f6f1b82a75cd18fb6f86f30dea45ad3f79cb785049a38854`. Written by `python -m model.train`; do not edit by hand.

SYNTHETIC_DEMO: the tree learned the spec 6 labelling rule from synthetic batches. These rules describe what it uses, not proven causes, and not field results.

A result is not_sure when the winning probability is below abstain_cut = 0.45. The cut was chosen on validation farms only: the lowest false reassurance rate with at least 85% of batches covered (validation coverage 87.7%, false reassurance 2.9%).

Thresholds are rounded here for reading; `web/tree.json` holds the exact values. Probabilities are class-weighted, as trained.

## Rule 1 (leaf 4): red

- dryness_check is dry
- musty_smell is no
- days_drying is 8 or less
- t14_mean is 25.07 or less
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 9.

## Rule 2 (leaf 5): green

- dryness_check is dry
- musty_smell is no
- days_drying is 8 or less
- t14_mean is above 25.07
- Probabilities: green 0.712, amber 0.176, red 0.112. Training batches reaching this leaf: 74.

## Rule 3 (leaf 7): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 49 or less
- Probabilities: green 0.976, amber 0.020, red 0.004. Training batches reaching this leaf: 240.

## Rule 4 (leaf 8): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 50 or more
- Probabilities: green 0.835, amber 0.127, red 0.039. Training batches reaching this leaf: 223.

## Rule 5 (leaf 11): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 8 or less
- Probabilities: green 0.113, amber 0.090, red 0.798. Training batches reaching this leaf: 17.

## Rule 6 (leaf 12): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 9 or more
- Probabilities: green 0.674, amber 0.226, red 0.100. Training batches reaching this leaf: 33.

## Rule 7 (leaf 14): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is 74.08 or less
- Probabilities: green 0.484, amber 0.385, red 0.131. Training batches reaching this leaf: 18.

## Rule 8 (leaf 15): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 74.08
- Probabilities: green 0.000, amber 0.109, red 0.891. Training batches reaching this leaf: 74.

## Rule 9 (leaf 19): amber

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is 72.53 or less
- Probabilities: green 0.073, amber 0.668, red 0.259. Training batches reaching this leaf: 40.

## Rule 10 (leaf 20): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is above 72.53
- Probabilities: green 0.000, amber 0.107, red 0.893. Training batches reaching this leaf: 150.

## Rule 11 (leaf 22): not_sure

- dryness_check is unsure
- musty_smell is no
- days_drying is 6 or more
- Probabilities: green 0.450, amber 0.397, red 0.153. Training batches reaching this leaf: 306.

## Rule 12 (leaf 23): amber

- dryness_check is damp
- musty_smell is no
- days_drying is 6 or more
- Probabilities: green 0.131, amber 0.623, red 0.246. Training batches reaching this leaf: 723.

## Rule 13 (leaf 26): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 78.61 or less
- days_drying is 7 or less
- Probabilities: green 0.012, amber 0.253, red 0.735. Training batches reaching this leaf: 160.

## Rule 14 (leaf 27): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 78.61 or less
- days_drying is 8 or more
- Probabilities: green 0.018, amber 0.721, red 0.262. Training batches reaching this leaf: 168.

## Rule 15 (leaf 29): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 79 or less
- Probabilities: green 0.016, amber 0.380, red 0.604. Training batches reaching this leaf: 219.

## Rule 16 (leaf 30): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 80 or more
- Probabilities: green 0.000, amber 0.065, red 0.935. Training batches reaching this leaf: 426.
