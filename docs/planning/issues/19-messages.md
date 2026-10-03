## Context
Specification sections 5.5: [docs/SankofaFresh_Spec_v2.md](https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/blob/main/docs/SankofaFresh_Spec_v2.md). This is planned work, not verified behavior.

## Priority
- Priority: P0
- Planning estimate: 1 to 2 focused person-hours, unvalidated and not a delivery guarantee.
- Task key: `messages`

## Dependencies
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/2
- Blocked by https://github.com/GeorgeDavidson2/SankofaFresh_SmallAI/issues/1

## Scope and implementation notes
- Write every spec 5.5 key in English and in the chosen language, in `web/messages.en.json` and `web/messages.<lang>.json`.
- A fluent speaker checks every local-language message.
- Optional audio: one short clip per key, generated at build time or recorded by a person, and checked by ear. Record the source and licence of each clip (Meta MMS-TTS is CC-BY-NC 4.0). Ship audio files only, never a speech model.
- If audio isn't working by 21:00 ET, ship text only.

## Acceptance criteria
- [ ] AC09: every message exists in both languages and the local-language set is checked by a fluent speaker.
- [ ] Both message files have exactly the same keys.
- [ ] If audio ships, every clip has a recorded source and licence and plays offline.

## Required evidence
- Both message files, the reviewer note, and the per-clip source and licence list if audio ships.

## Implementation notes
- Use a short branch such as `<issue-number>-<topic>` and a focused PR with `Closes #<issue-number>`.
- Keep shared-contract changes explicit in the PR. Attach commands/results or mark checks not run.
- Close the issue when its acceptance criteria and required evidence are complete.
- Do not add server APIs, databases, cloud inference, real SMS, accounts or real-world accuracy claims.
