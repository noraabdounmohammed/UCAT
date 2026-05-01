# Mock exam critique — current state vs real UKMLA AKT

Honest audit of `/mock` against what the GMC's Applied Knowledge Test actually looks and feels like, with prioritised recommendations.

---

## Real UKMLA AKT — the spec we're trying to simulate

| Aspect | Reality |
|---|---|
| **Format** | Single-best-answer (SBA) only — *not* EMQ, *not* cloze, *not* free-text calc |
| **Length** | 200 questions across **2 papers** (~100 each) with a break between |
| **Time** | 4 hours total (~72 s / question) |
| **Calculator** | None for most questions; some include drug-calc info but mental math is expected |
| **Pass mark** | Calibrated each cohort by the GMC, typically 60–65% |
| **Grading** | Pass / fail only — no graded outcome |
| **Mid-exam feedback** | None — you don't see right/wrong until results are released |
| **Navigation** | Free movement between questions, can flag for review |
| **Question grid** | Sidebar showing all questions with answered / flagged / unattempted state |
| **Topic blueprint** | Roughly: acute/critical care 20%, long-term conditions 20%, mental health 10%, child + reproductive health 15%, the rest spread across population health, ethics, etc. |
| **Images** | Yes — ECGs, X-rays, dermatology, fundoscopy |
| **Delivery** | Computer-based, locked-down kiosk (Pearson VUE typically) |

---

## What `/mock` does today

`MockPage.tsx` calls `useMockSession` with:

```ts
const MOCK_ATOM_COUNT = 20;
const MOCK_DURATION_SEC = 30 * 60;
```

Behaviour:

- Pulls 20 atoms via `listAvailableForExam()` — no filter, so calc / EMQ / cloze / case-bound atoms all eligible
- Random shuffle, presented one at a time
- Click an option → answer locked, advance to next
- Linear forward-only flow — no back, no flag, no question grid
- Result screen at end with score (now redesigned with pass-mark band — see PR linked below)
- Saves attempt to `mock_attempts` table

---

## Gap analysis

### 🔴 P0 — correctness / mental-model breakers

| # | Gap | Why it matters |
|---|---|---|
| 1 | **Mock includes non-SBA atoms** (calc, EMQ, cloze, case-bound) | Real AKT is SBA-only. A calc atom in `MockQuestion` renders the numeric answer as a clickable option — broken UX. EMQs have 11 options vs the expected 4 — out-of-place. Doesn't simulate what the real exam feels like. |
| 2 | **No filter for question_kind** | We have `question_kind='calc'` and `'emq'` flags in the DB. The mock blindly samples from everything. |
| 3 | **20 questions, 30 minutes** | Exam endurance is a real skill — answering the 180th question while tired is what people fail on. A 20-Q mock is OK for a quick taste but doesn't train stamina. |

### 🟡 P1 — UX parity with the actual exam

| # | Gap | Why it matters |
|---|---|---|
| 4 | **No flag-for-review** | Real exam lets you flag a question to revisit. Critical for time management — "skip the gnarly one, come back to it." |
| 5 | **No back-navigation** | You can't revise an answer you committed to. Real exam allows free movement. |
| 6 | **No question grid / progress map** | Real exam shows a navigator: "Q15: answered, Q16: flagged, Q17: not answered." We just show "5 / 20." |
| 7 | **No paper break** | Real AKT is two papers with a break between. Single 30-min session is fine for short mocks but not for 200-Q full mocks. |
| 8 | **Linear sequential, no jump-to-Q** | Tied to #6 — no way to navigate. |

### 🟢 P2 — feedback quality after the exam

| # | Gap | Why it matters |
|---|---|---|
| 9 | **No "review your answers" mode** | After the result, can't click into individual questions to see what was right/wrong + why. Huge learning miss. |
| 10 | **No topic / format breakdown of misses** | "You got 4/4 cardio right, 1/5 renal — focus there next." Currently just a single percentage. |
| 11 | **No time-per-question breakdown** | Helpful to flag rushed questions that the user got wrong. |
| 12 | **No flag list in result** | Tied to #4 — if we add flagging, the result should show flagged Qs first for review. |
| 13 | **Pass mark wasn't displayed** | ✅ Fixed in this PR — result now shows banded message and passmark callout vs the rough ~63% UKMLA cutoff. |

### 🔵 P3 — content + polish

| # | Gap | Why it matters |
|---|---|---|
| 14 | **No topic blueprint weighting** | Random sample doesn't match GMC blueprint. Could weight by `topic_path[0]` to roughly match acute / chronic / MH / paeds / obs proportions. |
| 15 | **Few images in the bank** | Real exam tests image interpretation (ECG, CXR, derm). We have `image_url` support but most atoms don't use it. Bank issue, not exam-flow issue. |
| 16 | **No multiple lengths** | Should offer 20 (quick) / 100 (single paper) / 200 (full mock) configurable from /mock. |
| 17 | **No difficulty calibration** | All atoms weight 1 mark. Could use `difficulty` field for IRT-style scoring. |
| 18 | **No "exam preview" before starting** | Real exam shows a tutorial first. Could add a brief "you'll have 30 min, can flag Qs, no feedback til the end" onboarding card. |

---

## What changed in this PR (UI modernisation)

- **`<MockResult />`** completely redesigned: banded pass/fail hero ("Crushing it" 80%+, "On track" 63–80%, "Building" 50–63%, "Plenty to learn" <50%), gradient celebration card, pass-mark callout vs UKMLA cutoff, time-used + per-question stats, "New mock" + "Review mistakes" CTAs.
- **`<MockQuestion />`** now matches `<AtomRenderer />` — letter chips (A/B/C/D), modern card, optional flag-for-review button (UI scaffold ready; needs wiring).
- **`<AtomRenderer />`** modernised with letter chips, animated reveal, gradient explanation card, "Nice — that's right" / "Not this one" copy, clear correct/wrong visual hierarchy.

---

## Recommended next steps (in order)

1. **Filter mock to SBA-only** — single-line change in `useMockSession.ts` to pass a `question_kind` filter, or a client-side filter post-fetch. P0.
2. **Wire flag-for-review** — `MockQuestion` already has the UI; `useMockSession` needs to track a `flaggedAtomIds` Set and surface to result. P1.
3. **Add length picker on /mock** — 20 / 50 / 100 / 200. Adjust `durationSec` proportionally (90 s / Q to roughly match real). P1.
4. **Build "review answers" view after result** — click a question in a grid to see your answer, the correct, and the explanation. P1 + huge learning leverage.
5. **Topic + format breakdown in result** — bar charts of correct % per topic_path[0]. P2.
6. **Question navigator sidebar** — visual grid of 20 dots showing answered / flagged / unattempted. P2.
7. **Topic-blueprint weighting** — sample atoms with proportions matching the GMC blueprint. P3.

The current mock is a usable practice tool, but doesn't yet simulate the *test-taking* experience. The biggest leap in fidelity comes from adding flag/review/navigation (P1) so students train the metacognition the real exam demands, not just recall.
