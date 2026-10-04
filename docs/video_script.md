# Video script

One video, under 4 minutes 45 seconds, covering the five required parts in order. Spoken lines are the quoted blocks (522 words; about 4 minutes 34 seconds at 140 words a minute, including about 50 seconds of demo taps; 4 minutes 39 seconds if the taps take 55). "Do" steps are what the phone shows. "Numbers" lines give the file behind every number that is spoken; don't read them aloud. [evidence/demo/demo-flow.mp4](../evidence/demo/demo-flow.mp4) runs through the same demo without sound, and [evidence/demo/README.md](../evidence/demo/README.md) describes every screen.

Before recording: open the live app (https://devfrankduah.github.io/SankofaFresh_SmallAI/) once with a connection so the app is stored on the phone. If it has been used before, open Settings and tap "Delete all records": that returns it to the welcome screen. Have airplane mode one swipe away, and record the phone screen with the status bar visible, so viewers can see airplane mode.

## 1. The problem (about 30 seconds)

> Because of this tool, a smallholder coffee farmer will check which stored batch needs drying or a moisture test by Saturday, before the buyer comes, that they would otherwise not do at all; we know because few farmers own a moisture meter, twelve percent moisture is the recommended maximum for dry parchment, and buyers discount coffee that is wetter.
>
> Our demo is set in Kwahu South, Ghana, and the app speaks Twi.

Numbers: "few farmers own a moisture meter", FAO Guidelines for the Prevention of Mould Formation in Coffee (2006) p. 21; twelve percent, FAO (2006) p. 17; the discount for coffee above twelve percent, ILO Uganda coffee value chain mapping (2024) p. 32. All cited in README.md. Location and language: issue #1 and README.md, Data.

## 2. What the AI does, and why SMS, a spreadsheet or a search wouldn't do the same job (about 45 seconds)

> SankofaFresh asks about a stored batch in seven tap-only steps, from how long it dried to the day it was bagged. A small decision tree on the phone weighs those answers against the usual humidity for those weeks and gives one of four results: green, amber, red, or not sure.
>
> SMS needs signal and a person; a spreadsheet or a search can't judge this batch offline.
>
> Guardrails: every word comes from a fixed list that ships with the app, nothing is generated, "Don't know" gives not sure, records stay on the phone with no account, and it never sends anything.

Numbers: seven steps, the form in `web/app.js` (`askedInputs`: the eight `web/contract.json` inputs less `days_stored`, which the app counts from the bagging date to today); four results, `web/contract.json` (bands).

## 3. Demo (about 130 seconds, including the taps)

Do:

1. Show the welcome screen: the Sankofa mark, SankofaFresh, the promise in English and in Twi, and "Works with no signal".
2. Swipe down and turn on airplane mode, then show the status bar. Reload the page. The welcome comes back from the phone itself.

> Airplane mode is on, and the app reloads from the phone itself.

3. Scroll to How it works. Tap Twi, hold for two seconds on the Twi steps, then tap English.

> The first screen explains it in three pictures, in English or Twi.

4. Tap Continue, then "Load demo batches". The list reads "2 of 3 batches need a check", worst first, each tagged "Demo data, not a real batch".

> Three demo batches, marked as demo data.

5. Open Batch 2, at the top. Hold on the amber stamp, the hand chip, the dry-again action with its picture, and the row of fourteen suns with "Usual weather for these weeks, from NASA records for 2025."

> Rained on while drying, in dry weeks: fourteen suns. A humidity-only rule calls it green; our tree says amber, because the hand test found it damp: dry it again.

6. Scroll down to "Practice result: this check learned from made-up examples, not from real farms." and the SMS draft under "Not sent. You decide whether to send it.", and tap Copy SMS.

> Every result is labelled practice. The message to the cooperative isn't sent; the farmer decides.

7. Tap Settings in the header, choose Twi, tap the house and reopen Batch 2. Hold on the Twi result for three seconds, then switch back to English in Settings.

> In Twi: "Hwɛ kɔfe kuw yi ntɛm. Hata kuw yi bio ansa na woakora anaa woatɔn."

The quoted Twi is the speaker-checked `band_amber` and `action_redry` from `web/messages.tw.json`.

8. Tap the house and open Batch 3. It shows not sure, with the question-mark chip, the take-a-sample action and its picture, and no weather row.

> Here the farmer didn't do the hand test, so the app won't guess. Not sure: ask a person at the cooperative.

9. Tap the house and open Batch 1. It shows green, with no reasons, no action and fourteen suns.

> Dried twelve days and dry by hand: green.

10. Tap the house, then Add batch, and answer the seven steps: Batch 4, dried 3 days, rained on, on the floor, musty, damp. On the last step, first pick a date after today: "That date is after today." shows and the Check button stays disabled. Then pick 3 September 2026 and tap Check. It shows red, with the hand and nose chips and the dry-again action.

> A new check is seven steps, no typing, and a future bagging date is refused. Wet, musty, on the floor: red.

11. Tap "About this check". Hold on the farmer part: the practice-result label, How it works, "This check can be wrong. If it says not sure, ask a person at the cooperative." and that records stay on this phone. Then open Technical details and scroll to the model version, the file sizes and the metrics table.

> About this check says it can be wrong. On farms it never saw, the humidity rule called thirty-five point eight percent of truly bad batches safe; our tree, three point one percent. Labels are synthetic, and about a quarter of bad batches show amber, not red.

Numbers: Batch 2 rained on and fourteen suns, `evidence/demo_batches.json` (stored 2025-01-15 plus 10 days) and `evidence/demo/06-result-amber.png` (no day above 80% mean humidity in `web/weather.json`; the wettest is exactly 80%); twelve days, `evidence/demo_batches.json` (and `web/demo_batches.json`, the same inputs); seven steps, `evidence/demo/04-check-form.png` (step 4 of 7); the red check, `evidence/demo/09-result-red.png`; thirty-five point eight and three point one percent, the false reassurance rate shown in Technical details, from `web/metrics.json` (0.3583 for the baseline and 0.0312 for the tree, test farms); about a quarter, `evidence/metrics.json` (115 of 480 truly red test batches shown amber).

## 4. Where it sits in the farmer's week, and the tech stack (about 40 seconds)

> In the household we designed for, the smartphone is home at weekends, so this is a Saturday habit before the buyer comes; during the week, the basic phone handles texts with the cooperative.
>
> Under the hood: a static web app with no server, and a service worker keeps every file on the phone. The whole app is about two hundred and fifty kilobytes; the tree is twelve. A new language means one fluent speaker translating ninety-six fixed messages, with no retraining. Next: a pilot with one Kwahu South cooperative, whose moisture meter turns sampled batches into real labels.

Numbers: about two hundred and fifty kilobytes, Technical details shows 247.8 kB for the 18 files the phone caches, and `evidence/sizes.json` gives 252,199 bytes for all 19 files in `web/` (adding the service worker itself) when this was written; twelve kilobytes, `web/tree.json` (12,029 bytes); ninety-six messages, `web/contract.json` (message_keys).

## 5. What localizing AI development means to us (about 25 seconds)

> For us, localizing AI means starting from the farmer's week, the phone already in the house, and the weather where the coffee is stored, and keeping the model small enough to live there. One fluent speaker on our team checked the Twi on screen, and our labels are still synthetic, so the next step is the field, not a bigger model.

Numbers: "checked the Twi on screen", README.md How it works step 5 and docs/ACCEPTANCE.md AC09: the speaker checked 94 of the 96 Twi strings; the other 2 are screen-reader text, not shown on screen.

## Checks before recording

- Read the numbers again from `web/metrics.json`, `evidence/metrics.json`, `evidence/sizes.json` and `web/contract.json` if anything has changed since this script was written (model `tree-v2-9b83270`, 96 message keys).
- Step 10 uses 3 September 2026 as the bagging date, as in the red still. The weather row follows the date, so a different date can show a different mix of suns and drops; the narration doesn't count them.
- If the form asks for more than one video, cut at the part headings above.
- Data limits from spec section 10 that the video must not contradict: labels are synthetic, the weather is one coarse grid cell for one year, and there has been no field test.
