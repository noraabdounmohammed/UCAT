import { describe, it, expect } from 'vitest';
import { pickRenderer } from '@/components/study/QuestionRouter';
import type { Atom } from '@/atom/types';

function makeAtom(overrides: Partial<Atom> = {}): Atom {
  return {
    id: 'a-default',
    exam: 'UKMLA',
    topicPath: ['Cardiology'],
    claim: 'claim',
    canonicalStem: 'stem',
    answer: 'ans',
    distractors: ['x', 'y', 'z'],
    difficulty: 3,
    imageUrl: null,
    imageAlt: null,
    citationUrl: 'https://example.test',
    citationLabel: 'NICE',
    sourceType: 'doctor_seed',
    prereqAtomIds: [],
    highYield: false,
    freeTier: false,
    reviewedBy: null,
    reviewedAt: null,
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('pickRenderer', () => {
  it('routes calc atoms to the calc renderer', () => {
    expect(pickRenderer(makeAtom({ questionKind: 'calc' }))).toBe('calc');
  });

  it('routes explicit cloze atoms to the cloze renderer', () => {
    expect(pickRenderer(makeAtom({ questionKind: 'cloze' }))).toBe('cloze');
  });

  it('routes explicit sba atoms to sba (no random flip)', () => {
    expect(pickRenderer(makeAtom({ questionKind: 'sba' }))).toBe('sba');
  });

  it('routes EMQ atoms to sba (rendered via AtomRenderer)', () => {
    expect(pickRenderer(makeAtom({ questionKind: 'emq' }))).toBe('sba');
  });

  it('case-bound atoms always route to sba (cloze would break the vignette structure)', () => {
    // Even if hash bucket would otherwise pick cloze, caseId forces sba.
    const atom = makeAtom({
      id: 'force-cloze-bucket',
      caseId: 'some-case-id',
      questionKind: undefined,
    });
    expect(pickRenderer(atom)).toBe('sba');
  });

  it('hash-bucket selection is deterministic for the same id', () => {
    const a1 = makeAtom({ id: 'stable-id', questionKind: undefined });
    const a2 = makeAtom({ id: 'stable-id', questionKind: undefined });
    expect(pickRenderer(a1)).toBe(pickRenderer(a2));
  });

  it('hash-bucket can produce both kinds across different ids', () => {
    // Sample a handful of ids; we expect to see both 'sba' and 'cloze'.
    const kinds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      kinds.add(pickRenderer(makeAtom({ id: `bucket-${i}`, questionKind: undefined })));
    }
    expect(kinds.has('sba')).toBe(true);
    expect(kinds.has('cloze')).toBe(true);
  });
});
