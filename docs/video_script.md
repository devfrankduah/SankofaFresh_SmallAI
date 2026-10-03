# Video script

One video, under 4 minutes 45 seconds, covering the five required parts in order. Spoken lines are the quoted blocks (594 words; about 4 minutes 39 seconds at 140 words a minute, including about 25 seconds of demo taps). "Do" steps are what the phone shows. "Numbers" lines give the file behind every number that is spoken; don't read them aloud.

Before recording: open the live app (https://devfrankduah.github.io/SankofaFresh_SmallAI/) once with a connection so the app is stored on the phone, delete any old records in Settings, and have airplane mode one swipe away. Record the phone screen with the status bar visible, so viewers can see airplane mode.

## 1. The problem (about 35 seconds)

> Because of this tool, a smallholder coffee farmer will check which stored batch needs drying or a moisture test by Saturday, before the buyer comes, that they would otherwise not do at all; we know because few farmers own a moisture meter, twelve percent moisture is the recommended maximum for dry parchment, and buyers discount coffee that is wetter.
>
> Our demo is set in Bepong, Kwahu South, in Ghana's Eastern Region, and the app speaks Twi.

Numbers: "few farmers own a moisture meter", FAO Guidelines for the Prevention of Mould Formation in Coffee (2006) p. 21; twelve percent, FAO (2006) p. 17; the discount for coffee above twelve percent, ILO Uganda coffee value chain mapping (2024) p. 32. All cited in README.md. Location and language: issue #1 and README.md, Data.

## 2. What the AI does, and why SMS, a spreadsheet or a search wouldn't do the same job (about 55 seconds)

> SankofaFresh asks eight questions you answer by tapping: which batch, how long it dried, whether rain got on it, whether the bags sit on the floor, whether it smells musty, what your hand test says, when storage began, and how many days it has lasted. A small decision tree on the phone weighs those answers against local humidity and gives one of four results: green, amber, red, or not sure.
>
> SMS needs signal and a person; a spreadsheet or a search can't judge this batch offline.
>
> Guardrails: every word is from a fixed, human-written list; nothing is generated. "Don't know" gives not sure and points to a person. Records stay on the phone, with no account, name or location. And it never sends anything.

Numbers: eight questions, `web/contract.json` (inputs); four results, `web/contract.json` (bands).

## 3. Demo (about 115 seconds, including the taps)

Do:

1. Show the app open on the phone, on the batch list.
2. Swipe down and turn on airplane mode, then show the status bar.
3. Reload the page. The app comes back from the phone itself.

> Airplane mode is on, and the app reloads from the phone itself.

4. Tap Settings (top right), then "Load demo batches". The batch list shows three batches marked "Demo data, not a real batch".

> Three demo batches, clearly marked as demo data.

5. Open Batch 1. It shows green.

> Dried twelve days, never rained on, dry by the hand test, stored twenty days. Green: keep storing as you are.

6. Go back and open Batch 2. It shows amber, with the reason about the hand test and the action to dry it again.

> This one was rained on while drying, and it's checked in dry January weeks. A rule that only looks at humidity calls it green. Our tree says amber: the hand test found it damp, so dry it again before selling.

7. Twi is live (`web/contract.json` lists `tw`). Tap Settings, choose Twi, go back and reopen Batch 2. Hold on the Twi result for three seconds, then switch back to English in Settings.

> In Twi, the same result reads: "Hwɛ kɔfe kuw yi ntɛm. Hata kuw yi bio ansa na woakora anaa woatɔn." Check this batch soon; dry it again before you store or sell it.

The quoted Twi is the reviewed `band_amber` and `action_redry` from `web/messages.tw.json`.

8. Scroll down to the SMS draft labelled SIMULATED_NOT_SENT, and tap Copy SMS.

> Here is a message to the cooperative. It's marked not sent. The farmer decides whether to send it.

9. Go back and open Batch 3. It shows not sure.

> Here the farmer didn't do the hand test, so the app won't guess. Not sure: ask a person at the cooperative.

10. Tap "About this check" to open the evidence screen. Hold on the model version, file sizes and the metrics table.

> The evidence screen shows how the model did on farms it never saw. On truly bad batches, the humidity rule called thirty-six percent safe; our tree called three percent safe. These are synthetic labels from a documented rule, not field measurements. And the tree is weaker in one place: about a quarter of bad batches show amber instead of red.

Numbers: twelve days, twenty days, January, `evidence/demo_batches.json` (and `web/demo_batches.json`, the same inputs); thirty-six percent and three percent, `web/metrics.json` (false_reassurance_rate 0.3583 for the baseline and 0.0312 for the tree, test farms); about a quarter, `evidence/metrics.json` (115 of 480 truly red test batches shown amber).

## 4. Where it sits in the farmer's week, and the tech stack (about 50 seconds)

> In the household we designed for, the smartphone is home at weekends, so this is a Saturday habit: check the stored batches before the buyer comes. During the week, the basic phone handles texts with the cooperative.
>
> Under the hood, it's a static web app with no server, and a service worker keeps every file on the phone. The whole app is about two hundred kilobytes; the tree itself is twelve. And a less-supported language? The app only ever shows a fixed list of eighty-seven messages, so a new language means one fluent speaker translating and checking that list, with no retraining. Next: a pilot with one Kwahu South cooperative, whose moisture meter turns sampled batches into real labels.

Numbers: about two hundred kilobytes, `evidence/sizes.json` (web_total_bytes, 201,234 bytes when this was written); twelve kilobytes, `web/tree.json` (12,029 bytes); eighty-seven messages, `web/contract.json` (message_keys).

## 5. What localizing AI development means to us (about 25 seconds)

> For us, localizing AI means starting from the farmer's week, the phone already in the house, and the weather where the coffee is stored, and keeping the model small enough to live there. One fluent speaker on our team checked the Twi, and our labels are still synthetic, so the next step is the field, not a bigger model.

## Checks before recording

- Read the numbers again from `web/metrics.json`, `evidence/metrics.json`, `evidence/sizes.json` and `web/contract.json` if anything has changed since this script was written (model `tree-v2-9b83270`, 87 message keys).
- If the form asks for more than one video, cut at the part headings above.
- Data limits from spec section 10 that the video must not contradict: labels are synthetic, the weather is one coarse grid cell for one year, and there has been no field test.
