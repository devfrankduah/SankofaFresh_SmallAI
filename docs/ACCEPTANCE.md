# Release evidence register

All entries are **NOT VERIFIED**. Replace status only with direct evidence tied to commit, configuration and model hash. Requirements below summarize specification section 13; the specification remains authoritative.

| ID | Required result | Planned task key | Status |
|---|---|---|---|
| AC01 | Valid registration; invalid quantity/dates/crop rejected | batch_api | NOT VERIFIED |
| AC02 | Identical seeded readings/predictions/alerts | reliability | NOT VERIFIED |
| AC03 | No future-reading leakage | features, reliability | NOT VERIFIED |
| AC04 | Missing readings produce unavailable/stale null fresh score | features, reliability | NOT VERIFIED |
| AC05 | Restart restores position/state without duplicate alerts | reliability | NOT VERIFIED |
| AC06 | Tree export parity including boundaries | inference | NOT VERIFIED |
| AC07 | Observable features and support handling | features | NOT VERIFIED |
| AC08 | Offline restart/reload/UI/inference/audio if included | offline_mobile | NOT VERIFIED |
| AC09 | 360 px, keyboard/touch, non-color status | ui_core, offline_mobile | NOT VERIFIED |
| AC10 | Actual LAN phone test if claimed | offline_mobile | NOT VERIFIED |
| AC11 | Fair held-out baseline/event/burden comparison | evaluation | NOT VERIFIED |
| AC12 | Synthetic labels and bounded claims | release | NOT VERIFIED |
| AC13 | Model bytes and 100+ warmed p95 calls measured | inference | NOT VERIFIED |
| AC14 | Pinned dependencies and teammate clean launch | offline_mobile | NOT VERIFIED |
