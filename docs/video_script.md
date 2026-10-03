# Video script

One video, 3.5 to 4.5 minutes, covering the five required parts in order. Spoken lines are the quoted blocks (576 words; with the demo taps, about 4 minutes 25 seconds). "Do" steps are what the phone shows. "Numbers" lines give the file behind every number that is spoken; don't read them aloud.

Before recording: open the live link once with a connection so the app is stored on the phone, delete any old records in Settings, and have airplane mode one swipe away. Record the phone screen with the status bar visible, so viewers can see airplane mode.

## 1. The problem (about 25 seconds)

> Because of this tool, a coffee farmer with no moisture meter can find out, on the family phone and with no signal, which stored batch to dry again or take to the cooperative before a buyer comes. Few farmers own a moisture meter, coffee above twelve percent moisture risks mould, and buyers pay less for wet coffee.

Numbers: twelve percent, FAO Guidelines for the Prevention of Mould Formation in Coffee (2006) p. 17 and ILO Uganda coffee value chain mapping (2024) p. 32; "few farmers own a moisture meter", FAO (2006) p. 21. All cited in README.md.

## 2. What the AI does, and why SMS, a spreadsheet or a search wouldn't do the same job (about 70 seconds)

> SankofaFresh asks eight questions you answer by tapping: how long the coffee dried, whether rain got on it, whether the bags sit on the floor, whether it smells musty, what your hand or bite test says, and how long it has been stored. A small decision tree inside the phone combines those answers with local humidity for the same weeks, and gives one of four results: green, amber, red, or not sure.
>
> An SMS line needs signal and a person at the other end. A spreadsheet can't weigh eight answers against the weather on a farmer's phone. A search needs data, and it gives general advice, not an answer about this batch.
>
> The guardrails matter as much as the model. Every word on screen comes from a fixed list of messages written by people; nothing is generated. If an answer is "don't know", or outside what the model has seen, it says not sure and points to a person. And it never sends anything. It only drafts a message.

Numbers: eight questions, `web/contract.json` (inputs); four results, `web/contract.json` (bands).

## 3. Demo (about 100 seconds, including the taps)

Do:

1. Show the app open on the phone, on the batch list.
2. Swipe down and turn on airplane mode, then show the status bar.
3. Reload the page. The app comes back from the phone itself.

> Airplane mode is on, and the app reloads from the phone itself.

4. Tap Settings (top right), then "Load demo batches". The batch list shows three batches marked "Demo data, not a real batch".

> These are three demo batches, clearly marked as demo data.

5. Open Batch 1. It shows green.

> Dried twelve days, never rained on, dry by the hand test, stored twenty days. Green: keep storing as you are.

6. Go back and open Batch 2. It shows amber, with the reason about the hand test and the action to dry it again.

> This one was rained on while drying, and it's checked in dry January weeks. A rule that only looks at humidity calls it green. Our tree says amber: the hand test found it damp, so dry it again before selling.

7. Scroll down to the SMS draft labelled SIMULATED_NOT_SENT, and tap Copy SMS.

> Here is a message to the cooperative. It's marked not sent. The farmer decides whether to send it.

8. Go back and open Batch 3. It shows not sure.

> Here the farmer didn't do the hand test, so the app won't guess. Not sure: ask a person at the cooperative.

9. Tap "About this check" to open the evidence screen. Hold on the model version, file sizes and the metrics table.

> The evidence screen shows which model this is and how it did on farms it never saw. On truly bad batches, the humidity rule called thirty-six percent safe. Our tree called three percent safe. These are synthetic labels from a documented rule, not field measurements. And the tree is weaker in one place: about a quarter of bad batches show amber instead of red.

Numbers: twelve days, twenty days, January, `evidence/demo_batches.json` (and `web/demo_batches.json`, the same inputs); thirty-six percent and three percent, `web/metrics.json` (false_reassurance_rate 0.3583 for the baseline and 0.0312 for the tree, test farms); about a quarter, `evidence/metrics.json` (115 of 480 truly red test batches shown amber).

## 4. Where it sits in the farmer's week, and the tech stack (about 40 seconds)

> In the household we designed for, the smartphone is home at weekends, so this is a Saturday habit: check the stored batches before the buyer comes. During the week, the basic phone carries the text messages with the cooperative.
>
> Under the hood, it's a static web app with no server: plain HTML and JavaScript, and a service worker that keeps every file on the phone. The whole app is under two hundred kilobytes, and the tree itself is twelve. We trained it in Python with scikit-learn, and the browser gives exactly the same answers as Python.

Numbers: under two hundred kilobytes, `evidence/sizes.json` (web_total_bytes, about 195 KB); twelve kilobytes, `web/tree.json` (12,029 bytes); same answers, `tests/test_parity.mjs` with `tests/fixtures/parity_cases.json`.

## 5. What localizing AI development means to us (about 30 seconds)

> For us, localizing AI means starting from the farmer's week, the phone already in the house, and the weather where the coffee is stored, and keeping the model small enough to live there. It also means saying plainly what we don't know yet. Our labels are synthetic and our Twi messages still need a fluent speaker, so the next step is the field, not a bigger model.

## Checks before recording

- Read the numbers again from `web/metrics.json` and `evidence/metrics.json` if the model has been retrained since this script was written (model `tree-v2-9b83270`).
- If the form asks for more than one video, cut at the part headings above.
- Data limits from spec section 10 that the video must not contradict: labels are synthetic, the weather is one coarse grid cell for one year, and there has been no field test.
