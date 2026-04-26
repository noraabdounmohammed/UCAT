import { useState } from 'react';
import type { DraftAtomInput } from '@/atom/seedRepository';
import type { AtomSourceType, Exam } from '@/atom/types';

const SOURCE_TYPES: AtomSourceType[] = ['NICE','NHS','BNF','GMC','past_paper','doctor_seed','student_bounty'];
const EXAMS: Exam[] = ['UKMLA','UCAT'];

export interface AtomSeedFormProps {
  onSubmit: (input: DraftAtomInput) => void | Promise<void>;
  onReset: () => void;
  status: 'idle' | 'submitting' | 'success' | 'error';
  errorMessage: string | null;
  lastAtomId: string | null;
}

export function AtomSeedForm({ onSubmit, onReset, status, errorMessage, lastAtomId }: AtomSeedFormProps) {
  const [claim, setClaim] = useState('');
  const [canonicalStem, setCanonicalStem] = useState('');
  const [answer, setAnswer] = useState('');
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [d3, setD3] = useState('');
  const [citationUrl, setCitationUrl] = useState('');
  const [citationLabel, setCitationLabel] = useState('');
  const [topicPath, setTopicPath] = useState('');
  const [difficulty, setDifficulty] = useState<1|2|3|4|5>(3);
  const [sourceType, setSourceType] = useState<AtomSourceType>('NICE');
  const [exam, setExam] = useState<Exam>('UKMLA');
  const [highYield, setHighYield] = useState(false);

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-4 space-y-3">
        <div className="text-base font-medium text-green-900">Atom queued for review ✓</div>
        <div className="text-xs text-green-800 break-all">{lastAtomId}</div>
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm"
        >
          Seed another
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      exam,
      topicPath: topicPath.split(',').map(s => s.trim()).filter(Boolean),
      claim: claim.trim(),
      canonicalStem: canonicalStem.trim(),
      answer: answer.trim(),
      distractors: [d1.trim(), d2.trim(), d3.trim()],
      difficulty,
      citationUrl: citationUrl.trim(),
      citationLabel: citationLabel.trim(),
      sourceType,
      highYield,
    });
  };

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-stone-700">Claim</span>
        <textarea required value={claim} onChange={(e) => setClaim(e.target.value)}
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
      </label>
      <label className="block text-sm">
        <span className="text-stone-700">Stem</span>
        <textarea required value={canonicalStem} onChange={(e) => setCanonicalStem(e.target.value)}
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm min-h-[80px]" />
      </label>
      <label className="block text-sm">
        <span className="text-stone-700">Answer</span>
        <input required type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
      </label>
      <div className="grid grid-cols-1 gap-2">
        <label className="block text-sm">
          <span className="text-stone-700">Distractor 1</span>
          <input required type="text" value={d1} onChange={(e) => setD1(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Distractor 2</span>
          <input required type="text" value={d2} onChange={(e) => setD2(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Distractor 3</span>
          <input required type="text" value={d3} onChange={(e) => setD3(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-stone-700">Citation URL</span>
        <input required type="url" value={citationUrl} onChange={(e) => setCitationUrl(e.target.value)}
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
      </label>
      <label className="block text-sm">
        <span className="text-stone-700">Citation label</span>
        <input required type="text" value={citationLabel} onChange={(e) => setCitationLabel(e.target.value)}
          placeholder="e.g. NICE CG126"
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
      </label>
      <label className="block text-sm">
        <span className="text-stone-700">Topic path</span>
        <input type="text" value={topicPath} onChange={(e) => setTopicPath(e.target.value)}
          placeholder="Cardiology, Stable angina"
          className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm" />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-sm">
          <span className="text-stone-700">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as 1|2|3|4|5)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Source type</span>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value as AtomSourceType)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm">
            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Exam</span>
          <select value={exam} onChange={(e) => setExam(e.target.value as Exam)}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm">
            {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={highYield} onChange={(e) => setHighYield(e.target.checked)} />
        <span>High yield</span>
      </label>
      {status === 'error' && errorMessage && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-3 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
