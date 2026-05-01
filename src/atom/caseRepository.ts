import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClinicalCase } from './types';

function rowToCase(row: any): ClinicalCase {
  return {
    id: row.id,
    exam: row.exam,
    title: row.title,
    vignetteMd: row.vignette_md ?? row.vignetteMd ?? '',
    citationUrl: row.citation_url ?? row.citationUrl ?? null,
    citationLabel: row.citation_label ?? row.citationLabel ?? null,
    status: row.status,
    createdAt: row.created_at ?? row.createdAt,
  };
}

/**
 * Module-level case cache. A study session typically encounters the same
 * chained case multiple times (Q1 → Q2 → Q3 of the same vignette), and
 * `<CaseVignette />` was previously doing one round-trip per atom render
 * → an N+1 problem on /mock with 50 questions.
 *
 * Cases rarely change, sessions are short, and the cache is per-tab —
 * we accept staleness for a session in exchange for cutting fetches by
 * ~3x. Callers can clear via `clearCaseCache()` (e.g. on auth change).
 */
const caseCache = new Map<string, ClinicalCase | null>();
const inflight = new Map<string, Promise<ClinicalCase | null>>();

export function clearCaseCache(): void {
  caseCache.clear();
  inflight.clear();
}

export interface CaseRepository {
  /** Single fetch by id (cached). */
  getById(id: string): Promise<ClinicalCase | null>;
  /** Batched fetch (cached) — used when hydrating a session queue. */
  getByIds(ids: string[]): Promise<Map<string, ClinicalCase>>;
}

export function createCaseRepository(supabase: SupabaseClient): CaseRepository {
  return {
    async getById(id) {
      if (caseCache.has(id)) return caseCache.get(id) ?? null;
      // De-duplicate concurrent requests for the same id (e.g. two
      // <CaseVignette /> mounts before the first resolves).
      const pending = inflight.get(id);
      if (pending) return pending;
      const p = (async () => {
        const { data, error } = await supabase
          .from('clinical_cases')
          .select('*')
          .eq('id', id)
          .limit(1)
          .single();
        if (error) {
          if ((error as any).code === 'PGRST116') {
            caseCache.set(id, null);
            return null;
          }
          throw error;
        }
        const c = data ? rowToCase(data) : null;
        caseCache.set(id, c);
        return c;
      })().finally(() => inflight.delete(id));
      inflight.set(id, p);
      return p;
    },

    async getByIds(ids) {
      const map = new Map<string, ClinicalCase>();
      if (ids.length === 0) return map;
      // Serve any cached ids immediately; only network-fetch the rest.
      const missing: string[] = [];
      for (const id of ids) {
        const cached = caseCache.get(id);
        if (cached === undefined) {
          missing.push(id);
        } else if (cached !== null) {
          map.set(id, cached);
        }
      }
      if (missing.length > 0) {
        const { data, error } = await supabase
          .from('clinical_cases')
          .select('*')
          .in('id', missing);
        if (error) throw error;
        for (const row of data ?? []) {
          const c = rowToCase(row);
          caseCache.set(c.id, c);
          map.set(c.id, c);
        }
        // Cache misses (id requested but no row) as null so we don't refetch.
        const found = new Set((data ?? []).map((r: any) => r.id));
        for (const id of missing) {
          if (!found.has(id)) caseCache.set(id, null);
        }
      }
      return map;
    },
  };
}
