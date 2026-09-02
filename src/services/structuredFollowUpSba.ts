import { generateAIResponse, QuestionContext } from './openai';

export type FollowUpSbaMode = 'application' | 'transfer' | 'prerequisite' | 'discriminator';

export type FollowUpSbaOption = {
  id: string;
  text: string;
};

export type StructuredFollowUpSba = {
  id: string;
  stem: string;
  options: FollowUpSbaOption[];
  correctAnswerId: string;
  rationale: string;
  teachingObjective: string;
  mode: FollowUpSbaMode;
  qa: {
    passed: true;
    attempts: number;
    checker: 'automated';
    version: 'followup-sba-v1';
  };
};

export type FollowUpSbaRequest = {
  mode: FollowUpSbaMode;
  teachingObjective: string;
};

type CandidateFollowUpSba = {
  stem: string;
  options: FollowUpSbaOption[];
  correctAnswerId: string;
  rationale: string;
  teachingObjective: string;
};

type QaResult = {
  pass: boolean;
  issues: string[];
};

function extractJson(raw: string): unknown {
  const clean = String(raw || '').trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() || clean;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object returned');
  return JSON.parse(fenced.slice(start, end + 1));
}

function normaliseOptionId(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function parseCandidate(raw: string, requestedObjective: string): CandidateFollowUpSba | null {
  try {
    const parsed = extractJson(raw) as any;
    const stem = String(parsed?.stem || '').replace(/\s+/g, ' ').trim();
    const options = Array.isArray(parsed?.options)
      ? parsed.options.map((option: any) => ({
          id: normaliseOptionId(option?.id),
          text: String(option?.text || '').replace(/\s+/g, ' ').trim(),
        }))
      : [];
    const correctAnswerId = normaliseOptionId(parsed?.correctAnswerId);
    const rationale = String(parsed?.rationale || '').replace(/\s+/g, ' ').trim();
    const teachingObjective = String(parsed?.teachingObjective || requestedObjective).replace(/\s+/g, ' ').trim();

    const ids = options.map(option => option.id);
    const uniqueIds = new Set(ids);
    const expectedIds = ['A', 'B', 'C', 'D'];
    const structurallySound =
      stem.length >= 18 &&
      stem.endsWith('?') &&
      options.length === 4 &&
      uniqueIds.size === 4 &&
      expectedIds.every(id => uniqueIds.has(id)) &&
      options.every(option => option.text.length >= 2) &&
      uniqueIds.has(correctAnswerId) &&
      rationale.length >= 8 &&
      teachingObjective.length >= 8;

    if (!structurallySound) return null;
    return { stem, options, correctAnswerId, rationale, teachingObjective };
  } catch {
    return null;
  }
}

function parseQa(raw: string): QaResult {
  try {
    const parsed = extractJson(raw) as any;
    return {
      pass: parsed?.pass === true,
      issues: Array.isArray(parsed?.issues)
        ? parsed.issues.map((issue: unknown) => String(issue || '').trim()).filter(Boolean).slice(0, 8)
        : [],
    };
  } catch {
    return { pass: false, issues: ['QA response was not valid JSON.'] };
  }
}

function candidateJson(candidate: CandidateFollowUpSba): string {
  return JSON.stringify(candidate, null, 2);
}

function generatorPrompt(request: FollowUpSbaRequest, repairIssues: string[] = []): string {
  const modeRule = request.mode === 'transfer'
    ? 'Test transfer of the SAME verified discriminator. Change at most one clinically meaningful variable, and only when the verified context directly supports what that change means. Do not introduce a new medical rule.'
    : request.mode === 'prerequisite'
      ? 'Test the smallest prerequisite or rule the learner needs in order to answer the verified current concept.'
      : request.mode === 'discriminator'
        ? 'Test the decisive discriminator that separates the correct answer from the learner’s plausible alternative.'
        : 'Test application of the verified explanation without merely repeating the original question.';

  const repair = repairIssues.length
    ? `\nThe previous candidate failed QA for these reasons. Fix ALL of them:\n- ${repairIssues.join('\n- ')}\n`
    : '';

  return `You are StudyEdit's structured follow-up SBA generator. Create ONE short, high-quality medical single-best-answer question from the VERIFIED CURRENT-QUESTION CONTEXT supplied separately.\n\nTeaching objective: ${request.teachingObjective}\nMode: ${request.mode}\n${modeRule}${repair}\n\nNON-NEGOTIABLE RULES:\n- Use ONLY medical facts contained in the verified current-question context. Do not rely on outside knowledge to make the keyed answer true.\n- There must be exactly ONE unambiguously best answer.\n- Return exactly four options labelled A, B, C, D.\n- The keyed answer must be directly supported by the verified explanation/key fact/distractor feedback.\n- Distractors must be plausible enough to diagnose reasoning, but clearly wrong from the same verified context.\n- Do not use “all of the above”, “none of the above”, trick wording, double negatives, or trivia.\n- Avoid answer-position, grammar, length, or wording clues.\n- Do not simply restate the original question.\n- Keep the stem concise and clinically meaningful.\n- The rationale must explain why the keyed answer is uniquely best using only the supplied verified context.\n\nReturn JSON ONLY in exactly this shape:\n{\n  "stem": "Question ending in ?",\n  "options": [\n    {"id":"A","text":"..."},\n    {"id":"B","text":"..."},\n    {"id":"C","text":"..."},\n    {"id":"D","text":"..."}\n  ],\n  "correctAnswerId": "A",\n  "rationale": "...",\n  "teachingObjective": "..."\n}`;
}

function qaPrompt(candidate: CandidateFollowUpSba, request: FollowUpSbaRequest): string {
  return `You are the independent StudyEdit follow-up SBA quality checker. Judge the candidate ONLY against the VERIFIED CURRENT-QUESTION CONTEXT supplied separately.\n\nRequested teaching objective: ${request.teachingObjective}\nRequested mode: ${request.mode}\n\nCANDIDATE:\n${candidateJson(candidate)}\n\nReject the question if ANY of these are true:\n1. The keyed answer is not directly entailed by the verified context.\n2. More than one option could reasonably be correct.\n3. A distractor is medically unsupported or requires outside knowledge to rule out.\n4. The question tests something other than the requested teaching objective.\n5. The stem or options introduce a clinically important fact that is not supported by the verified context.\n6. The correct answer is cued by wording, grammar, option length, absolutes, or obvious implausibility of distractors.\n7. It is effectively the same question as the original rather than a useful new check.\n8. The rationale does not justify why the keyed option is uniquely best.\n9. The wording is ambiguous, unsafe, misleading, or not appropriate for a UK medical learner.\n\nReturn JSON ONLY:\n{"pass": true, "issues": []}\nor\n{"pass": false, "issues": ["specific issue", "specific issue"]}`;
}

export async function generateQualityCheckedFollowUpSba(
  context: QuestionContext,
  request: FollowUpSbaRequest,
): Promise<StructuredFollowUpSba | null> {
  let repairIssues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let candidate: CandidateFollowUpSba | null = null;
    try {
      const generated = await generateAIResponse(generatorPrompt(request, repairIssues), context);
      candidate = parseCandidate(generated, request.teachingObjective);
    } catch (error) {
      console.warn('StudyEdit follow-up SBA generation failed:', error);
    }

    if (!candidate) {
      repairIssues = ['Return the required valid JSON structure with exactly four A-D options and one keyed answer.'];
      continue;
    }

    let qa: QaResult = { pass: false, issues: ['Automated QA did not complete.'] };
    try {
      qa = parseQa(await generateAIResponse(qaPrompt(candidate, request), context));
    } catch (error) {
      console.warn('StudyEdit follow-up SBA QA failed:', error);
    }

    if (qa.pass) {
      return {
        ...candidate,
        id: `followup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: request.mode,
        qa: {
          passed: true,
          attempts: attempt,
          checker: 'automated',
          version: 'followup-sba-v1',
        },
      };
    }

    repairIssues = qa.issues.length ? qa.issues : ['The candidate did not pass the quality gate.'];
  }

  return null;
}
