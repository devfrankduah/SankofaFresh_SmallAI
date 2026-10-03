# Release evidence register

All entries are **NOT VERIFIED**. They are requirements, not achieved results, until evidence is attached. Replace a status only with direct evidence tied to a commit and, where it applies, the tree hash. Criteria come from [Spec v2](SankofaFresh_Spec_v2.md) section 9, which stays authoritative. Task keys map to issue numbers in the [issue index](planning/ISSUE_INDEX.md).

| ID | Criterion | Evidence | Task keys | Status |
|---|---|---|---|---|
| AC01 | "Don't know", out-of-range input or low confidence returns not_sure with a reason | JS unit tests | features, bands_baseline, offline_flow | NOT VERIFIED |
| AC02 | Same seed gives an identical dataset and tree hash | test_determinism | synthetic_data, test_gate | NOT VERIFIED |
| AC03 | No farm appears in more than one split | test_leakage | synthetic_data, test_gate | NOT VERIFIED |
| AC04 | Python and JS predictions match on all held-out rows, including threshold boundaries | test_parity | inference, test_gate | NOT VERIFIED |
| AC05 | tree.json under 250 KB; total app size measured and reported | test_size, evidence/sizes.json | train_export, inference, test_gate | NOT VERIFIED |
| AC06 | After one online load, the app works in airplane mode on a real phone, including a reload | Screen recording, offline-check.md | offline_flow, deploy_offline | NOT VERIFIED |
| AC07 | No network requests at runtime after install | Browser devtools network log | deploy_offline | NOT VERIFIED |
| AC08 | 360 px with no horizontal scroll; 44 px tap targets; status not by colour alone | Screenshot and checklist | pwa_screens | NOT VERIFIED |
| AC09 | Every result comes from the fixed message set; local-language messages checked by a fluent speaker | Message file and reviewer note | result_view, messages | NOT VERIFIED |
| AC10 | Tree and baseline compared on the same held-out farms with the metrics in section 7 | evidence/metrics.json | evaluation | NOT VERIFIED |
| AC11 | Records stay on device; consent screen shown; delete clears everything | Manual check | device_records | NOT VERIFIED |
| AC12 | SYNTHETIC_DEMO on every result; no claims of field accuracy, food safety or income gains | Claims review | result_view, release | NOT VERIFIED |
| AC13 | A teammate can regenerate data, retrain and run the app from the README on a clean checkout | Clean-run log | release | NOT VERIFIED |
