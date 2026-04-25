# Atomic Engine — End-to-End Design Spec

| | |
|---|---|
| Date | 2026-04-25 |
| Status | Draft (under user review) |
| Owners | Engineering: dev. Clinical / founder: Nora Mohammed, MD. |
| Codename | Atomic Engine (no public-facing rebrand yet) |
| Replaces | Bolt-style component soup currently shipping at studyedit.com |

---

## 1. Vision

A universal, evidence-based exam-prep engine — UKMLA first, structurally generalisable to any exam where atomic facts must be recalled under timed pressure. Built around three things competitors don't have working together: state-of-the-art spaced repetition, retrieval-first UX, and a named, accountable doctor signing off content.

> **The single decision filter for every feature**: does this increase 30-day recall of exam content? If no, kill it.

## 2. Success metrics ("world-class" defined measurably)

Achieved by **Month 6 of the new engine being live** with ≥ 200 paid users:

| Metric | Industry today | Our bar |
|---|---|---|
| Day-30 free-recall on atoms studied | not measured | **≥ 85%** |
| Predicted-vs-actual exam-day score gap | n/a | **< 5pp** |
| Daily-active rate (over 30 days) | 25-35% | **≥ 60%** |
| Net Promoter Score | ~45 (Quesmed) | **≥ 60** |
| Mock-exam score lift over 8-week sub | n/a | **≥ 15pp** |
| Free → paid conversion | 3-5% | **≥ 8%** |
| Retained at Day 30 (paid users) | ~50% | **≥ 75%** |

All measurable from the FSRS event stream + pre/post mock exam scores + in-app NPS prompt. No external instrumentation needed.

## 3. Architecture

### 3.1 Three-pillar core

```
              ┌──────────────────────────────────┐
              │  PILLAR 1: ATOM GRAPH            │
              │  • Exam-agnostic schema           │
              │  • Atomic testable claim         │
              │  • Prerequisite edges            │
              │  • Difficulty + image + citation │
              └──────────────┬───────────────────┘
                             │
              ┌──────────────┴───────────────────┐
              ▼                                  ▼
  ┌────────────────────────┐         ┌────────────────────────┐
  │ PILLAR 2: FSRS-5 ENGINE│         │ PILLAR 3: REVIEW QUEUE │
  │ • Schedules every atom │         │ • Nora's mobile inbox  │
  │ • Stability + retrievab│         │ • 30s/atom async       │
  │ • Drives ALL UX        │         │ • Approve/edit/reject  │
  └────────────┬───────────┘         └──────────┬─────────────┘
               │                                ▲
               ▼                                │
  ┌────────────────────────┐         ┌──────────┴─────────────┐
  │ STUDENT APP            │         │ CONTENT PIPELINE       │
  │ • 3-min retrieval      │         │ • Nora seeds (voice)   │
  │ • Predicted score live │         │ • RAG over public srcs │
  │ • Mistake deck         │         │ • Friend bounty £100   │
  │ • Voice mode           │         │ • Student bounty £3-5  │
  │ • Cohort leaderboards  │         │ • Past-paper extraction│
  └────────────────────────┘         └────────────────────────┘
```

### 3.2 Atom schema (Postgres / Supabase)

```sql
atoms (                          -- the unit of memory; one testable fact
  id              uuid pk
  exam            text         -- 'UKMLA' | 'UCAT' | future...
  topic_path      text[]       -- ['Cardiology','Stable Angina']
  claim           text         -- the testable fact
  canonical_stem  text         -- question stem (one canonical, used if no variant)
  answer          text
  distractors     jsonb        -- 3 plausible wrongs
  difficulty      smallint     -- 1-5, FSRS-calibrated over time
  image_url       text         -- nullable (Cloudflare R2)
  image_alt       text
  citation_url    text not null
  citation_label  text not null   -- e.g. 'NICE CG126'
  source_type     text not null   -- 'NICE' | 'NHS' | 'BNF' | 'past_paper' | 'doctor_seed'
  prereq_atom_ids uuid[]       -- inline array v1; junction table v2 if perf needs it
  high_yield      boolean default false
  free_tier       boolean default false   -- exposed to free users; ~50 of these to start
  reviewed_by     uuid references auth.users(id)
  reviewed_at     timestamptz
  status          text         -- 'draft' | 'pending_review' | 'approved' | 'rejected'
  created_at      timestamptz default now()
)

atom_variants (                  -- alternate stems testing the same atom
  id              uuid pk        -- FSRS state lives on parent atom, not variant
  parent_atom_id  uuid fk references atoms(id)
  stem            text
  answer          text
  distractors     jsonb
  generated_by    text         -- 'ai-deepseek-v3' | 'human' | 'past_paper'
  reviewed_by     uuid references auth.users(id)
  status          text         -- 'draft' | 'pending_review' | 'approved' | 'rejected'
)
-- session-time selection: pick a random approved variant per encounter to prevent
-- rote pattern-matching of the canonical stem. FSRS state updates the parent atom.

user_atom_state (              -- FSRS state per (user, atom)
  user_id         uuid fk
  atom_id         uuid fk
  stability       real
  difficulty      real
  due_at          timestamptz
  last_review_at  timestamptz
  reps            int default 0
  lapses          int default 0
  primary key (user_id, atom_id)
)

review_events (                -- the source of truth for retention metrics
  id              uuid pk
  user_id         uuid fk
  atom_id         uuid fk
  rating          smallint     -- FSRS 1-4 (forgot/hard/good/easy)
  confidence      smallint     -- pre-reveal 1-4
  response_ms     int
  created_at      timestamptz default now()
)
```

This schema is exam-agnostic. Adding UCAT in 2027 = inserting rows with `exam='UCAT'`, no schema change.

### 3.3 FSRS-5 engine

Use the open-source `ts-fsrs` npm package (FSRS-5 algorithm, MIT-licensed, ~6 KB). State-of-the-art — beats Anki SM-2 by ~30% efficiency in published benchmarks.

Wire it as the **only** scheduler. There is no "browse mode" by default. The engine decides what to study next. Every retrieval session pulls atoms from `due_at <= now()` ordered by overdue-ness.

### 3.4 Review queue (Nora's mobile inbox)

A Progressive Web App route at `/review` (or admin shell):

- Lists atoms with `status='pending_review'` in priority order (high-yield first, oldest first)
- Each card: full atom with citation source visible
- Three buttons: **Approve** / **Edit** (inline) / **Reject + reason**
- Designed for 30 seconds per atom
- Voice-input for inline edits (Web Speech API, free)
- Works offline, syncs when online (PWA + Supabase Realtime)

## 4. Student-facing UX

### 4.1 The 3-minute session (default unit)

5-7 atoms pulled from FSRS due-queue. Mix new + review.

```
[stem + image]
[How sure? ○ ○ ○ ○]   <- pre-reveal confidence (UWorld pattern)
   ↓ tap
[reveal answer + citation chip]
[Forgot · Hard · Good · Easy]   <- FSRS rating
   ↓ auto-advance
```

End-of-session: `5/7 right · predicted exam-day score 67% → 68% · streak day 12 🔥`.

### 4.2 Modes

| Mode | When | UX |
|---|---|---|
| **3-min default** | Daily habit | 5-7 atoms, FSRS-driven |
| **Mistake deck** | Recent misses (auto-built) | Same UX, filtered queue |
| **Mock exam** | Pre-real-exam | Full timed GMC-style simulation matching real UKMLA AKT length and pacing (verify exact spec on GMC site at build time) |
| **Voice mode** ⭐ | Commute, walks | TTS reads stem → student speaks answer → STT transcribes → match. Hands-free. |
| Browse | Power users only | Topic tree, opt-in, doesn't update FSRS |

### 4.3 Predicted exam-day score (live)

Bayesian estimate from:
- Retention probabilities across all atoms in user's queue (FSRS gives this for free)
- Coverage % of UKMLA syllabus
- Calibrated against historical cohort performance once we have ≥ 30 students who've sat the real exam

Updated after every answer. Displayed as: `73% · target 70% ✅ · 23 days to go`. This is the conversion trigger: when predicted < target, paywall pitch ("close the gap with full atom bank").

### 4.4 Streaks + cohort leaderboards

- **Streak with grace** (Duolingo pattern): 1 free skip-day per week. Comeback bonus on return.
- **Streak shareable**: auto-generated image card ("Day 47 🔥, predicted score 76%") → Instagram / WhatsApp. Free organic distribution.
- **Cohort leaderboards**: by med school, optional opt-in. Anonymous handles.
- **Study buddy invites**: 1 friend joined = +14-day streak grace. Viral coefficient.

## 5. Content pipeline

### 5.1 Sources (legal, mostly free)

| Source | Cost | Use |
|---|---|---|
| NICE guidelines | Free | RAG corpus for variant generation, citations |
| NHS clinical pathways | Free | RAG corpus, citations |
| BNF (personal use) | Free | Drug-dose atoms, citations |
| GMC content map / UKMLA blueprint | Free | Topic prioritisation, syllabus coverage check |
| UKMLA past papers | Free (when published) | Highest-signal atom extraction |
| BMJ Best Practice | ~£10-30k/yr commercial | Defer until revenue justifies |
| Textbook RAG | ❌ copyright risk | Don't |
| Nora's lived experience | Priceless | Topic prioritisation, voice seeding |
| Friend doctors (cohort) | £100/wknd × 5 = £500 | One-off seeding sprint |
| Med-student bounty | £3-5/atom approved | Scales beyond Nora |

### 5.2 Atom production strategy

```
Nora seeds skeleton ──→ AI generates variants (RAG)  ──→ Nora reviews
~10 atoms/hour          10 variants per atom              30 seconds each
voice-driven on phone   DeepSeek + RAG over NICE/NHS     mobile inbox
```

**v1 rule: atoms are doctor-seeded only** (Nora, doctor-friend bounty, or past-paper extracted). AI generates *variant stems* of approved atoms. This keeps the highest-stakes content judgement (what to test, with what claim, citing which source) firmly clinician-controlled while letting AI scale presentation variety.

Throughput target: **~50-100 atoms/week reviewed and live.** Over 6 months that's 1,200-2,400 atoms — enough for a credible UKMLA launch. Quesmed's QB is ~5,000 questions but most bundle multiple facts; our atomic decomposition hits the high-yield testable core more efficiently per minute of student time.

### 5.3 Voice-driven seeding (the unblocker)

Nora records voice notes during walks / nap times: *"first-line treatment for stable angina, beta-blocker, NICE CG126, often confused with ACEi"*. App transcribes (Whisper API, ~$0.006/min — negligible), parses into atom skeleton, queues AI variant generation. **This bypasses the typing bottleneck without crossing the legal line.**

### 5.4 Crowdsourcing & bounty (defer to month 3)

- **Friend bounty**: 5 doctor-friends, £100 each for 50 atoms each in a weekend = 250 atoms, £500 spend, one-off
- **Student bounty**: £3-5 per atom passing Nora's review. Marketing: med-school societies, study groups
- All crowdsourced atoms still go through the same review queue — no quality compromise

### 5.5 Past-paper extraction

UKMLA AKT past papers (when published by GMC) = the highest-signal source. The *facts being tested* aren't copyrightable — extract atoms from past questions. Highest-yield content in the entire pipeline.

## 6. Differentiators / moats

### vs each major competitor

| | What they have | What we have they don't |
|---|---|---|
| **Quesmed** | Largest UKMLA QB, percentile data | FSRS engine, predicted score, voice mode, made-by-doctor brand |
| **Passmedicine** | Cheap, large QB, integrated notes | UX, mobile, retention engine |
| **UWorld** | Premium analytics, image quality | Half the price, UK-tuned, retrieval-first |
| **AMBOSS** | Integrated knowledge base | Cheaper, exam-tuned, no German jankiness |
| **Anki** | World-class spaced rep | Curated content, image-stems, mobile UX, made-for-you |

### Defensible moats (year 2+)

1. **Cohort effect**: when 30%+ of a med-school year uses it, peer pressure converts the rest. School-by-school dominance compounds.
2. **Calibration data**: every cohort sharpens our predicted-score accuracy. Late entrants can't catch up without our data.
3. **Nora-as-brand**: personal accountability is a moat against faceless content teams.
4. **Voice mode**: cheap to copy operationally, hard to copy *well*. UX details matter.
5. **FSRS data network**: aggregate retention curves across 1000s of students = best-in-class atom-difficulty calibration.

## 7. Codebase strategy

### 7.1 Pivot in place — *don't* start fresh

Current codebase has real value: working Stripe + Supabase auth + Capacitor mobile shell + Apple HIG aesthetic + 6 months of Nora's design intuition baked in. Tearing it down loses 4-6 weeks. Instead:

- **Keep**: auth, Stripe, Supabase wiring, Capacitor build, Apple HIG visual language, PWA scaffolding, Netlify functions structure
- **Add new modules** (alongside): `src/atom/`, `src/fsrs/`, `src/review/`, `src/voice/`, `src/predicted-score/`, `src/streak/`
- **Refactor**: split `PracticeSection.tsx` (51 KB) into `<FSRSession>` + `<AtomRenderer>` + mode-specific shells
- **Delete** (cleanup sprint, week 1):
  - Inworld voice tutor: `src/services/inworldRealtimeService.ts`, `inworldService.ts`, `realtimeTutorService.ts`, `netlify/functions/inworld-*.ts`, `@inworld/web-core` dep
  - Concept graph view: `ConceptGraphView.tsx`, `ConceptGraphView.new.tsx`
  - EMQ / T-F / Ranking renderers: `EMQQuestion.tsx`, `TrueFalseQuestion.tsx`, `RankingQuestion.tsx`
  - Marketplace / publishing UI: `PublishCurriculumModal.tsx`, `ImportExpertModal.tsx` (keep service for now, gate behind feature flag)
  - Bulk concept upload: `ConceptBulkUploadModal*.tsx`, `ConceptBulkUploadPage*.tsx`
  - All `*.bak`, `*.fixed*`, `*.new`, `*.old`, `*.loft*` files (~30 files)
  - Mastery rings, Bloom bars, coverage tiles components in `src/components/track/`
  - `Inworld` SDK from package.json
- **Test coverage**: every new module has Vitest tests from day 1. Ratchet existing code coverage as we touch it.

### 7.2 Tech stack (cost-conscious, free-tier-first)

| Concern | Choice | Cost | Free tier limit |
|---|---|---|---|
| Hosting | Netlify (already on it) | £0 | 100 GB bw, 300 build min, 125k fn invocations |
| Database | Supabase (already on it) | £0 | 500 MB, 50k MAU, 2 GB egress |
| LLM (variant gen) | DeepSeek (already on it) | ~£10/mo | n/a (pay per token, dirt cheap) |
| LLM fallback | OpenAI gpt-4o-mini | abs.layer | for redundancy |
| TTS (voice mode) | **Web Speech API (browser)** | £0 | unlimited, browser-native |
| TTS fallback | Google Cloud TTS | $4/M chars | for unsupported browsers, premium tier |
| STT (voice mode + seeding) | **Web Speech API (browser)** | £0 | unlimited |
| STT fallback | OpenAI Whisper | $0.006/min | for accuracy-critical (Nora's seeding) |
| Image storage | Cloudflare R2 | £0 | 10 GB free, no egress fees |
| Auth | Supabase Auth | £0 | included |
| Email | Resend | £0 | 3k emails/month |
| Analytics | PostHog | £0 | 1M events/month |
| Error tracking | Sentry | £0 | 5k errors/month |
| Domain | studyedit.com (owned) | £0 | – |
| Mobile builds | Capacitor (already wired) | £0 | – |
| **Estimated monthly total** | | **£10-50/mo** | through ~1k MAU |

When we hit free-tier ceilings (likely Month 4-6 if growth is healthy), revenue covers infra. Until then, ~£50/month worst case.

### 7.3 Repo cleanup priority order

1. Delete obvious cruft (`*.bak`, `*.fixed`, `*.new`, `*.old`, `*.loft`) — half-day
2. Remove Inworld + voice tutor — 1 day, including dep removal & function deletion
3. Remove unused question renderers (EMQ/T-F/Ranking) — 1 day
4. Remove vanity-metric components (rings/bars/tiles) — 0.5 day
5. Remove marketplace UI (gate behind `featureFlags.creatorMarketplace = false`) — 0.5 day
6. Set up Vitest + Playwright + first smoke test — 1 day
7. Refactor `PracticeSection.tsx` into smaller modules as we add new modes — gradual

## 8. Cost budget (6 months bootstrapped)

| Line | Month 1-3 | Month 4-6 | Notes |
|---|---|---|---|
| Hosting + DB + auth | £0 | £0-25 | Free tier, may scale at end |
| LLM (DeepSeek) | £5-15 | £15-50 | Volume = atom variants + voice mode |
| Whisper (Nora seeding) | £2-5 | £5-10 | 30 min/day × 30 days × $0.006/min ≈ £4 |
| Cloudflare R2 (images) | £0 | £0 | 10 GB free |
| Email (Resend) | £0 | £0 | Free tier covers |
| Analytics + error | £0 | £0 | Free tiers cover |
| Domain (already owned) | £0 | £0 | – |
| Friend bounty (one-off) | £500 | £0 | Month 2 atom-seeding sprint |
| Student bounty | £0 | £100-300 | Activates only post-launch |
| Marketing (paid) | £0 | £0 | Organic only until LTV proven |
| **Total** | **£500-525** | **£120-385** | One-off £500 + ~£20-65/mo run rate |

## 9. Distribution plan

### 9.1 Pre-launch (Months 1-2)

- **Build in public**: Nora posts twice a week — work-in-progress screenshots, study tips, what she's learning rebuilding her own UKMLA prep tool. Threads / X / Instagram. £0.
- **Waitlist landing page**: studyedit.com homepage = waitlist + Nora's story. Live by week 2.

### 9.2 Cohort launch (Month 3)

- One well-crafted post in Nora's UK med-school year groups, alumni networks, F1/F2 WhatsApp groups. £0.
- Goal: 50-100 friend-and-family beta users, free Pro for 30 days in exchange for honest feedback + an in-app NPS reply.

### 9.3 Public launch (Month 4)

- Reddit: organic helpful posts on r/medicalschoolUK, r/medicine, r/JuniorDoctorsUK
- TikTok: Nora records 30-sec study tips on her phone (during walks), dev edits with captions. 2-3/week sustainable. £0.
- Med-school societies: 5-10 partnerships for free trials in exchange for in-lecture announcement. £0.
- Atom landing pages: each atom = a public SEO page (stem + first sentence of explanation; full answer behind sign-up). Slow-burn organic traffic. £0.

### 9.4 Viral mechanics (built into the product)

- **Predicted-score share cards**: auto-generated image of `76% predicted, 23 days to UKMLA` → students post pre-exam. Branded with studyedit.com URL.
- **Streak share cards**: `Day 47 🔥`. Same flow.
- **Study-buddy invites**: invite a friend → both get +14-day streak grace. K-factor lever.
- **Cohort leaderboards**: naturally creates "I need to be on the leaderboard" pressure.
- **Mock-exam-day live battles**: Saturday-morning shared mock event, top score shared.

### 9.5 Paid acquisition (deferred to Month 6+)

Only after CAC < LTV proven via organic. Test budgets £200-500 on Meta / TikTok / Google Search ads targeted at UKMLA keywords + UK med-school year-group lookalikes.

## 10. Pricing & business model

| Tier | Price | What |
|---|---|---|
| **Free** | £0 | Full FSRS engine on 50 atoms (real taste). No browse / no mock / no voice mode. |
| **Pro** | **£19.99/mo** or **£149/yr** (37% saving) | Full atom bank, mock exams, mistake deck, voice mode, predicted score, cohort leaderboards |
| **Cohort / B2B** | Defer 12+ mo | – |

- 7-day free Pro trial after sign-up
- Conversion trigger: when predicted exam score crosses target → paywall pitch ("close the gap with the full bank")
- Pricing is *under* Quesmed (~£25-40/mo) but signals "premium" via UX, not via "AI". The "AI" angle is over-played and will be commoditised; the *retention engine* won't.
- Annual is the prize: lower CAC payback, better cash flow, lower churn.

## 11. 12-week build plan

| Week | Theme | Deliverables |
|---|---|---|
| 1 | **Cleanup + foundation** | Delete cruft, remove Inworld, set up Vitest + Playwright, scaffold `src/atom/` `src/fsrs/`, atom schema migration |
| 2 | **FSRS engine + state** | `ts-fsrs` integration, `user_atom_state` updates on review events, scheduling endpoint |
| 3 | **Atom renderer + 3-min session** | New `<FSRSession>` component, confidence rating, FSRS rating, auto-advance, end-of-session summary |
| 4 | **Review queue (Nora's inbox)** | `/review` route, mobile-first, voice-input edits, approve/edit/reject. Manually seed 20 dummy atoms so Nora can dogfood the inbox by Friday week 4. |
| 5 | **Atom seeding pipeline** | Voice-note → Whisper → AI structuring → draft atom. RAG variant generation over NICE/NHS/BNF. First **50 atoms** reviewed and live (the free-tier seed). |
| 6 | **Image stems + citations + mistake deck** | Image upload to R2, citation chip, auto-built mistake deck mode |
| 7 | **Predicted exam-day score** | Bayesian model, live update, paywall trigger logic |
| 8 | **Streaks + share cards + auth-tier gates** | Streak with grace, shareable image generation, free-tier vs Pro gating |
| 9 | **Voice mode (hands-free retrieval)** | Web Speech TTS + STT, voice-answer matching, fallback to Whisper for accuracy |
| 10 | **Mock exam mode + cohort leaderboards** | Timed GMC-style mock, leaderboards by med school, opt-in handles |
| 11 | **Beta launch to Nora's cohort** | 50-100 users, NPS instrumentation, retention measurement begins |
| 12 | **Polish + Pro paywall live + public launch prep** | Stripe Pro tier wired to predicted-score trigger, first paid conversions, prep public launch |

Stretch (Month 4): UCAT exam-2 spike to prove the engine generalises.

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Nora burns out (new mum + reviewing) | High | Existential | Throttle review rate to actual hours, voice-first seeding, friend bounty offload, dev handles all non-clinical work |
| 2 | AI hallucination → bad clinical content → reputation hit | Medium | Existential | Every atom Nora-signed-off, citation mandatory, public source attribution |
| 3 | Quesmed copies voice mode / FSRS | Medium | Moderate | Ship faster, cohort lock-in within 2 schools by Month 6 |
| 4 | DeepSeek API instability / pricing change | Medium | Low | Provider abstraction layer, OpenAI fallback wired |
| 5 | Capacitor App Store rejection | Low | Moderate | PWA-first launch, native app v2 only after web validates |
| 6 | GDPR / data privacy issue with student PII | Low | High | Supabase EU region, minimal PII collected, anonymous handles by default |
| 7 | UKMLA past papers not released by GMC | Medium | Moderate | Don't depend on them for launch; bonus when available |
| 8 | Existing leaked secrets exploited | High (already leaked) | High | **Rotate now**: DeepSeek key in `DEPLOYMENT.md`, old Supabase project on `master` |
| 9 | Free-tier ceilings hit before revenue | Medium | Low | Estimated month 4-6; revenue should cover by then |
| 10 | "Made by a doctor" becomes liability if wrong atom slips through | Low | High | Citation per atom, public errata page, fast-fix workflow |

## 13. Out of scope (kill list, deferrals)

**Killed** (deleted in week 1):
- Inworld real-time voice tutor — wrong implementation; voice retrieval mode replaces it
- Concept graph canvas view — pretty, not pedagogical
- EMQ, True/False, Ranking question renderers — not in UKMLA real exam at meaningful frequency
- Mastery rings, Bloom bars, coverage tiles — vanity metrics
- Bulk concept upload UI — premature creator tool
- All `*.bak`, `*.fixed`, `*.new`, `*.old`, `*.loft.tsx` cruft files

**Deferred** (year 2+):
- Creator marketplace — wait for engine traction
- B2B / cohort licensing for med schools — wait for product-market fit
- Multi-exam (UCAT in 2027 if UKMLA traction proves)
- Native iOS / Android (PWA-first)
- AMBOSS-style integrated knowledge-base cross-links between concepts
- Adaptive difficulty / IRT (FSRS gets us 80% of this for free)
- Live-tutoring / clinical reasoning multi-step cases

## 14. Open questions

1. **Existing-user count on current studyedit.com app** — assumed near-zero. If wrong, migration plan needed.
2. **Nora's exact weekly availability** — assumed ~15 hrs effective. If significantly less, throttle further.
3. **Brand decision** — Study Edit / Medicu / something else? Affects domain/marketing investment. Not blocking.
4. **First-cohort size target** — 50 or 100 at Month 3 beta? Affects support burden.
5. **Past UKMLA paper availability** — does GMC publish them annually? Worth chasing.

---

*Spec lives in `docs/superpowers/specs/`. Next step: writing-plans skill produces an executable plan.*
