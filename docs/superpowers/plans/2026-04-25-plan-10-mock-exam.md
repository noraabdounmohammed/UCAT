# Plan 10 — Mock Exam Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** A `/mock` route — timed mock exam. Sequentially presents N approved atoms with a countdown clock; no FSRS scheduling during the mock; final score breakdown at the end (correct / incorrect / skipped, time used, predicted-score-effect placeholder for Plan 10B). Spec §4.2.

**Scope discipline:**
- v1 = 20-atom mock, ~30-min default timer.
- Bank source = `atomRepo.listApprovedByExam(exam)` randomly sampled (no spaced-rep ordering — it's a test).
- No persistence of mock-attempt history in v1 (saved as a Plan 10B follow-up using a new `mock_attempts` table).
- Cohort leaderboards deferred to Plan 11.
- Confidence rating skipped — mock-mode just collects right/wrong via answer click.

## Architecture

- **Pure mock-state machine** in `src/mock/state.ts`: `tickTimer`, `submitAnswer`, `isFinished`, `computeScore`.
- **Hook** `useMockSession({ atomRepo, exam, atomCount, durationSec })` — loads bank, owns timer + state, exposes `currentAtom`, `progress`, `submit(choiceIndex)`, `score`, `status`.
- **Components:**
  - `<MockQuestion atom onSubmit({ correct, choiceIndex }) />` — renders 4 multiple-choice options (answer + 3 distractors, randomly shuffled per atom). One click submits.
  - `<MockTimer secondsLeft />` — visible countdown.
  - `<MockResult score totalAtoms timeUsedSec />` — final breakdown.
- **Page** `<MockPage>` at `/mock` — wires the hook + components, gated on auth (no isCreator gate; any authed user can mock).

## Phases — 10 tasks, 8 commits

### A — Mock state machine (TDD)

Task 1 RED: 6 tests covering timer tick, answer submission, finished detection, score computation.
Task 2 GREEN: `src/mock/state.ts` pure functions.

### B — useMockSession hook (TDD)

Task 3 RED: 4 tests against a mocked atomRepo and a fake clock.
Task 4 GREEN: `src/hooks/useMockSession.ts`.

### C — Components (TDD)

Task 5 RED: `tests/components/MockQuestion.test.tsx` — 3 tests (renders 4 options shuffled, click submits with correct flag, locks after submit).
Task 6 GREEN: `src/components/mock/MockQuestion.tsx` + `MockTimer.tsx` + `MockResult.tsx` (one commit batched — small components).

### D — Page + route

Task 7: `src/pages/MockPage.tsx` + lazy `/mock` route in `App.tsx` + `'mock'` in `MainLayout` `currentPage` union.

### E — Integration + verify

Task 8: integration test for full mock flow (load → answer 3 → timer expires → result).
Task 9: CHANGELOG + battery.

## Out of scope (Plan 10B follow-ups)

- Persistent `mock_attempts` table — record results for analytics + history page
- Per-topic score breakdown
- "Resume" capability (timer doesn't pause if window closes)
- Real GMC-style 4-hour, 2-paper format — v1 is 30 min as a one-paper test
- Cohort leaderboards (Plan 11)
- Adaptive difficulty
