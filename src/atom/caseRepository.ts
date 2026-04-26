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

export interface CaseRepository {
  /** Single fetch by id — used when rendering an atom that has `caseId` set. */
  getById(id: string): Promise<ClinicalCase | null>;
  /** Batched fetch — used when hydrating a session queue containing many cases. */
  getByIds(ids: string[]): Promise<Map<string, ClinicalCase>>;
}

export function createCaseRepository(supabase: SupabaseClient): CaseRepository {
  return {
    async getById(id) {
      const { data, error } = await supabase
        .from('clinical_cases')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      return data ? rowToCase(data) : null;
    },

    async getByIds(ids) {
      const map = new Map<string, ClinicalCase>();
      if (ids.length === 0) return map;
      const { data, error } = await supabase
        .from('clinical_cases')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      for (const row of data ?? []) {
        const c = rowToCase(row);
        map.set(c.id, c);
      }
      return map;
    },
  };
}
