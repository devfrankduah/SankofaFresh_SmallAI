# Decision tree rules

Model `tree-v2-9b83270`, sha256 `9b832703746e573e0135a212622c11e0b914e27b5cc037daa505f04bdb03a902`. Written by `python -m model.train`; do not edit by hand.

SYNTHETIC_DEMO: the tree learned the spec 6 labelling rule from synthetic batches. These rules describe what it uses, not proven causes, and not field results.

A result is not_sure when the winning probability is below abstain_cut = 0.442. The cut was chosen on validation farms only: the lowest false reassurance rate with at least 85% of batches covered (validation coverage 99.7%, false reassurance 2.0%).

Thresholds are rounded here for reading; `web/tree.json` holds the exact values. Probabilities are class-weighted, as trained.

## Rule 1 (leaf 4): red

- dryness_check is dry
- musty_smell is no
- days_drying is 8 or less
- t14_mean is 25.07 or less
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 9.

## Rule 2 (leaf 7): not_sure

- dryness_check is dry
- musty_smell is no
- days_drying is 4 or less
- t14_mean is above 25.07 and at most 28.00
- Probabilities: green 0.441, amber 0.351, red 0.208. Training batches reaching this leaf: 9.

## Rule 3 (leaf 8): green

- dryness_check is dry
- musty_smell is no
- days_drying is 5 to 8
- t14_mean is above 25.07 and at most 28.00
- Probabilities: green 0.886, amber 0.057, red 0.057. Training batches reaching this leaf: 45.

## Rule 4 (leaf 10): red

- dryness_check is dry
- musty_smell is no
- days_drying is 4 or less
- t14_mean is above 28.00
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 5.

## Rule 5 (leaf 11): amber

- dryness_check is dry
- musty_smell is no
- days_drying is 5 to 8
- t14_mean is above 28.00
- Probabilities: green 0.406, amber 0.517, red 0.077. Training batches reaching this leaf: 15.

## Rule 6 (leaf 15): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 49 or less
- rewetted is no
- t14_mean is 28.49 or less
- Probabilities: green 0.989, amber 0.011, red 0.000. Training batches reaching this leaf: 221.

## Rule 7 (leaf 16): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 49 or less
- rewetted is no
- t14_mean is above 28.49
- Probabilities: green 0.791, amber 0.209, red 0.000. Training batches reaching this leaf: 4.

## Rule 8 (leaf 18): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 45 or less
- rewetted is yes
- Probabilities: green 0.842, amber 0.122, red 0.036. Training batches reaching this leaf: 14.

## Rule 9 (leaf 19): red

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 46 to 49
- rewetted is yes
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 1.

## Rule 10 (leaf 22): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 50 or more
- rh14_mean is 74.15 or less
- Probabilities: green 0.953, amber 0.044, red 0.003. Training batches reaching this leaf: 164.

## Rule 11 (leaf 23): green

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 50 or more
- rh14_mean is above 74.15 and at most 79.49
- Probabilities: green 0.673, amber 0.285, red 0.042. Training batches reaching this leaf: 25.

## Rule 12 (leaf 25): amber

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 50 to 107
- rh14_mean is above 79.49
- Probabilities: green 0.247, amber 0.637, red 0.116. Training batches reaching this leaf: 21.

## Rule 13 (leaf 26): red

- dryness_check is dry
- musty_smell is no
- days_drying is 9 or more
- days_stored is 108 or more
- rh14_mean is above 79.49
- Probabilities: green 0.000, amber 0.336, red 0.664. Training batches reaching this leaf: 13.

## Rule 14 (leaf 31): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 7 or less
- days_drying is 8 or less
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 3.

## Rule 15 (leaf 32): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 8 to 9
- days_drying is 8 or less
- Probabilities: green 1.000, amber 0.000, red 0.000. Training batches reaching this leaf: 1.

## Rule 16 (leaf 34): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 10 to 49
- days_drying is 8 or less
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 8.

## Rule 17 (leaf 35): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 50 to 70
- days_drying is 8 or less
- Probabilities: green 0.000, amber 0.296, red 0.704. Training batches reaching this leaf: 5.

## Rule 18 (leaf 38): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 9 or more
- rewetted is no
- rh14_mean is 85.05 or less
- Probabilities: green 0.814, amber 0.144, red 0.043. Training batches reaching this leaf: 24.

## Rule 19 (leaf 39): amber

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 9 or more
- rewetted is no
- rh14_mean is above 85.05
- Probabilities: green 0.327, amber 0.519, red 0.154. Training batches reaching this leaf: 4.

## Rule 20 (leaf 41): amber

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 9 to 12
- rewetted is yes
- Probabilities: green 0.000, amber 1.000, red 0.000. Training batches reaching this leaf: 2.

## Rule 21 (leaf 42): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 70 or less
- days_drying is 13 or more
- rewetted is yes
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 3.

## Rule 22 (leaf 45): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is 69.63 or less
- Probabilities: green 1.000, amber 0.000, red 0.000. Training batches reaching this leaf: 5.

## Rule 23 (leaf 47): green

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 69.63 and at most 74.08
- t14_mean is 27.61 or less
- Probabilities: green 0.612, amber 0.243, red 0.144. Training batches reaching this leaf: 4.

## Rule 24 (leaf 48): amber

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 69.63 and at most 74.08
- t14_mean is above 27.61
- Probabilities: green 0.000, amber 0.771, red 0.229. Training batches reaching this leaf: 9.

## Rule 25 (leaf 51): amber

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 74.08
- rh14_max is 81.76 or less
- storage_surface is raised
- Probabilities: green 0.000, amber 0.716, red 0.284. Training batches reaching this leaf: 5.

## Rule 26 (leaf 52): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 74.08
- rh14_max is 81.76 or less
- storage_surface is floor
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 4.

## Rule 27 (leaf 54): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 74.08 and at most 86.75
- rh14_max is above 81.76
- Probabilities: green 0.000, amber 0.028, red 0.972. Training batches reaching this leaf: 60.

## Rule 28 (leaf 55): red

- dryness_check is dry
- musty_smell is yes
- days_stored is 71 or more
- rh14_mean is above 86.75
- rh14_max is above 81.76
- Probabilities: green 0.000, amber 0.296, red 0.704. Training batches reaching this leaf: 5.

## Rule 29 (leaf 60): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is 72.53 or less
- days_stored is 42 or less
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 7.

## Rule 30 (leaf 62): amber

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is 72.53 or less
- days_stored is 43 or more
- storage_surface is raised
- Probabilities: green 0.106, amber 0.844, red 0.050. Training batches reaching this leaf: 24.

## Rule 31 (leaf 63): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is 72.53 or less
- days_stored is 43 or more
- storage_surface is floor
- Probabilities: green 0.000, amber 0.457, red 0.543. Training batches reaching this leaf: 9.

## Rule 32 (leaf 66): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is above 72.53
- t14_mean is 27.80 or less
- days_stored is 8 or less
- Probabilities: green 0.000, amber 0.296, red 0.704. Training batches reaching this leaf: 5.

## Rule 33 (leaf 67): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is above 72.53
- t14_mean is 27.80 or less
- days_stored is 9 or more
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 100.

## Rule 34 (leaf 69): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is above 72.53
- t14_mean is above 27.80
- storage_surface is raised
- Probabilities: green 0.000, amber 0.457, red 0.543. Training batches reaching this leaf: 27.

## Rule 35 (leaf 70): red

- dryness_check is unsure or damp
- musty_smell is no
- days_drying is 5 or less
- rh14_mean is above 72.53
- t14_mean is above 27.80
- storage_surface is floor
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 18.

## Rule 36 (leaf 74): green

- dryness_check is unsure
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is 72.84 or less
- rewetted is no
- Probabilities: green 0.800, amber 0.200, red 0.000. Training batches reaching this leaf: 67.

## Rule 37 (leaf 75): amber

- dryness_check is unsure
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is 72.84 or less
- rewetted is yes
- Probabilities: green 0.340, amber 0.540, red 0.120. Training batches reaching this leaf: 15.

## Rule 38 (leaf 77): green

- dryness_check is unsure
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is above 72.84
- days_stored is 53 or less
- Probabilities: green 0.677, amber 0.300, red 0.022. Training batches reaching this leaf: 70.

## Rule 39 (leaf 78): amber

- dryness_check is unsure
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is above 72.84
- days_stored is 54 or more
- Probabilities: green 0.099, amber 0.565, red 0.336. Training batches reaching this leaf: 154.

## Rule 40 (leaf 81): amber

- dryness_check is damp
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is 69.87 or less
- Probabilities: green 0.404, amber 0.572, red 0.025. Training batches reaching this leaf: 67.

## Rule 41 (leaf 82): amber

- dryness_check is damp
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is above 69.87 and at most 76.76
- Probabilities: green 0.130, amber 0.761, red 0.110. Training batches reaching this leaf: 244.

## Rule 42 (leaf 84): amber

- dryness_check is damp
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is above 76.76
- days_stored is 96 or less
- Probabilities: green 0.110, amber 0.675, red 0.215. Training batches reaching this leaf: 245.

## Rule 43 (leaf 85): red

- dryness_check is damp
- musty_smell is no
- days_drying is 6 or more
- rh14_mean is above 76.76
- days_stored is 97 or more
- Probabilities: green 0.000, amber 0.269, red 0.731. Training batches reaching this leaf: 167.

## Rule 44 (leaf 90): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 72.38 or less
- days_drying is 3 or less
- Probabilities: green 0.000, amber 0.095, red 0.905. Training batches reaching this leaf: 17.

## Rule 45 (leaf 91): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 72.38 or less
- days_drying is 4 to 7
- Probabilities: green 0.043, amber 0.575, red 0.382. Training batches reaching this leaf: 37.

## Rule 46 (leaf 93): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 72.38 and at most 78.61
- days_drying is 5 or less
- Probabilities: green 0.000, amber 0.025, red 0.975. Training batches reaching this leaf: 67.

## Rule 47 (leaf 94): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 72.38 and at most 78.61
- days_drying is 6 to 7
- Probabilities: green 0.000, amber 0.303, red 0.697. Training batches reaching this leaf: 39.

## Rule 48 (leaf 97): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 75.49 or less
- days_drying is 8 or more
- rewetted is no
- Probabilities: green 0.035, amber 0.851, red 0.114. Training batches reaching this leaf: 78.

## Rule 49 (leaf 98): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is 75.49 or less
- days_drying is 8 or more
- rewetted is yes
- Probabilities: green 0.000, amber 0.650, red 0.350. Training batches reaching this leaf: 40.

## Rule 50 (leaf 100): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 75.49 and at most 78.61
- days_drying is 8 or more
- storage_surface is raised
- Probabilities: green 0.000, amber 0.684, red 0.316. Training batches reaching this leaf: 32.

## Rule 51 (leaf 101): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 75.49 and at most 78.61
- days_drying is 8 or more
- storage_surface is floor
- Probabilities: green 0.000, amber 0.174, red 0.826. Training batches reaching this leaf: 18.

## Rule 52 (leaf 105): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 79 or less
- days_drying is 5 or less
- Probabilities: green 0.000, amber 0.031, red 0.969. Training batches reaching this leaf: 53.

## Rule 53 (leaf 106): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 79 or less
- days_drying is 6 to 9
- Probabilities: green 0.020, amber 0.296, red 0.685. Training batches reaching this leaf: 94.

## Rule 54 (leaf 108): amber

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 65 or less
- days_drying is 10 or more
- Probabilities: green 0.035, amber 0.770, red 0.196. Training batches reaching this leaf: 41.

## Rule 55 (leaf 109): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 66 to 79
- days_drying is 10 or more
- Probabilities: green 0.000, amber 0.481, red 0.519. Training batches reaching this leaf: 31.

## Rule 56 (leaf 112): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 80 to 119
- storage_surface is raised
- Probabilities: green 0.000, amber 0.257, red 0.743. Training batches reaching this leaf: 94.

## Rule 57 (leaf 113): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 80 to 119
- storage_surface is floor
- Probabilities: green 0.000, amber 0.020, red 0.980. Training batches reaching this leaf: 84.

## Rule 58 (leaf 114): red

- dryness_check is unsure or damp
- musty_smell is yes
- rh14_mean is above 78.61
- days_stored is 120 or more
- Probabilities: green 0.000, amber 0.000, red 1.000. Training batches reaching this leaf: 248.
