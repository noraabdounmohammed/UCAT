import React, { useMemo, useState } from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import type { QuestionData } from './questionTypes';

type ReportReason =
  | 'incorrect_answer'
  | 'ambiguous'
  | 'outdated'
  | 'typo'
  | 'unclear_explanation'
  | 'other';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'incorrect_answer', label: 'Answer appears incorrect' },
  { value: 'ambiguous', label: 'Question is ambiguous' },
  { value: 'outdated', label: 'May be outdated' },
  { value: 'typo', label: 'Typo or formatting issue' },
  { value: 'unclear_explanation', label: 'Explanation is unclear' },
  { value: 'other', label: 'Something else' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function questionStem(question: QuestionData): string {
  return String(
    question.question_stem ||
      question.stem ||
      question.question ||
      question.individual_question ||
      ''
  ).trim();
}

async function resolveCachedQuestionId(question: QuestionData): Promise<string | null> {
  const client = supabase as any;
  const rawId = String(question.id || '');

  if (UUID_RE.test(rawId)) {
    const { data } = await client
      .from('cached_questions')
      .select('id')
      .eq('id', rawId)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const conceptId = String(question.concept_id || '');
  const stem = questionStem(question);
  if (!conceptId || !stem) return null;

  const { data } = await client
    .from('cached_questions')
    .select('id')
    .eq('concept_id', conceptId)
    .eq('question_stem', stem)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  return data?.id || null;
}

interface ReportQuestionButtonProps {
  question: QuestionData;
}

export const ReportQuestionButton: React.FC<ReportQuestionButtonProps> = ({ question }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const fallbackQuestionKey = useMemo(() => {
    const stem = questionStem(question).replace(/\s+/g, ' ').slice(0, 600);
    return `${question.concept_id || 'unknown'}:${question.id || stem}`;
  }, [question]);

  const reset = () => {
    setReason(null);
    setDetails('');
    setSubmitted(false);
    setMessage('');
    setSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const submitReport = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setMessage('Please sign in to report a question.');
        return;
      }

      const cachedQuestionId = await resolveCachedQuestionId(question);
      const questionKey = cachedQuestionId || fallbackQuestionKey;
      const client = supabase as any;
      const { error } = await client.from('question_reports').insert({
        question_id: cachedQuestionId,
        question_key: questionKey,
        concept_id: question.concept_id || null,
        user_id: authData.user.id,
        reason,
        details: details.trim() || null,
      });

      if (error?.code === '23505') {
        setSubmitted(true);
        setMessage("You've already reported this question. Thanks for flagging it.");
        return;
      }

      if (error) throw error;

      setSubmitted(true);
      setMessage('Thanks. Your report has been recorded.');
    } catch (error) {
      console.error('Failed to report question:', error);
      setMessage('We could not submit that report just now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Flag className="h-3.5 w-3.5" />
        Report question
      </Button>

      <DialogContent className="max-w-md">
        {submitted ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <DialogTitle>Report received</DialogTitle>
            </div>
            <DialogDescription>{message}</DialogDescription>
            <p className="text-xs text-muted-foreground">
              Repeated independent reports can automatically quarantine a question so it is no longer served while it is reviewed.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report this question</DialogTitle>
              <DialogDescription>
                Tell us what looks wrong. One report flags the item; repeated independent reports can temporarily remove it from practice for review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {REASONS.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setReason(item.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    reason === item.value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background hover:bg-muted/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Textarea
              value={details}
              onChange={event => setDetails(event.target.value.slice(0, 1000))}
              placeholder="Optional: tell us what you noticed"
              rows={3}
            />

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitReport()}
                disabled={!reason || submitting}
              >
                {submitting ? 'Sending…' : 'Send report'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportQuestionButton;
