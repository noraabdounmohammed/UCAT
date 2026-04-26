-- Plan 13F — per-question explanation grounded in the cited guideline.
--
-- User: 'is there a copyright free way for you to provide extracts from the
-- book / explanation when someone picks the wrong answer on why the
-- correct answer is right? This would be far more useful than just
-- highlighting a correct answer.'
--
-- Standard pattern in UK med-exam apps (Passmedicine, Quesmed, Medbullets):
-- AI-paraphrased rationale grounded in the citation source. Each atom
-- already has `citation_url` + `citation_label` (e.g. NICE CG126).
-- NICE + NHS content is Open Government Licence — paraphrasing for
-- educational use is fully copyright-compliant.
--
-- Adds:
--   - `explanation`        text, nullable — 3-5 sentence rationale
--   - `explanation_source` text, nullable — short attribution string
--                          (we always defer to citation_label/url for the
--                          authoritative reference, but this lets us name
--                          a different source if the explanation crosses
--                          guidelines)
--   - `explanation_generated_at` timestamptz — for resumable backfill

alter table public.atoms
  add column if not exists explanation text,
  add column if not exists explanation_source text,
  add column if not exists explanation_generated_at timestamptz;
