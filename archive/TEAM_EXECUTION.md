# Team execution guide

This guide applies to [Spec v2](../docs/SankofaFresh_Spec_v2.md), the offline coffee parchment PWA. Where they differ, the spec wins.

## Working together

The team is GeorgeDavidson2 and devfrankduah. Either teammate can pick an unblocked issue and start working. There are no assigned roles, task owners or designated merge owner.

Check dependencies before starting. A brief issue comment or draft PR signals work in progress and avoids duplicate effort; no assignment step is required. Use short branches named `<issue-number>-<topic>` and focused PRs with `Closes #N` and acceptance evidence. Note shared-contract changes in the PR so dependent work stays compatible.

Native dependency links describe blockers; they don't enforce merge order. Integrate small changes often and keep unrelated changes out of each branch. GitHub Issues is the work tracker, and each issue carries its scope, dependencies, acceptance criteria and required evidence.

## Checkpoints (ET)

The submission deadline is still to be confirmed in [issue #1](https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/1). Until it is, work to these checkpoints. Times after midnight fall on the following day. If a checkpoint slips, say so straight away and cut scope rather than letting the slip move downstream.

| Time (ET) | Checkpoint | Task keys |
|---|---|---|
| 14:30 | Language and demo location decided | coordination |
| 19:00 | End-to-end offline flow running on a real phone | offline_flow |
| 21:00 | Cut audio if it isn't working; ship text-only messages | messages |
| 23:00 | Deployed and checked in airplane mode | deploy_offline |
| 05:00 | Video rough cut | video |
| 08:30 | Submitted | release |

Task keys map to issue numbers in the [issue index](planning/ISSUE_INDEX.md).

## Dependency outline

- contracts and scaffold unblock device_records, features and pwa_screens. scaffold alone unblocks weather, and contracts alone unblocks bands_baseline.
- coordination (the language decision) and contracts unblock messages. messages and pwa_screens unblock result_view.
- weather and features unblock synthetic_data, which unblocks train_export. train_export and features unblock inference.
- inference, result_view, device_records, bands_baseline and weather unblock offline_flow, which unblocks deploy_offline.
- train_export, bands_baseline and synthetic_data unblock evaluation. inference and synthetic_data unblock test_gate.
- offline_flow and evaluation unblock video.
- coordination, evaluation, test_gate, deploy_offline and video unblock release.

The longest chain runs scaffold, weather, synthetic_data, train_export, inference, offline_flow, deploy_offline and release, so the data and model work should start first. The weather scripts take coordinates as arguments, so they can be written before the 14:30 location decision.

## Cutting scope

Every open issue is P0. Audio is the one planned cut: if it isn't working by 21:00 ET, ship text only. Never cut the not_sure band, the offline check or the SYNTHETIC_DEMO label.

## Open decisions

Tracked in [issue #1](https://github.com/devfrankduah/SankofaFresh_SmallAI/issues/1) (spec section 13): exact deadline, form fields and video format; local language and demo location, chosen together; repository visibility and static host for judges; prior concept disclosure.
