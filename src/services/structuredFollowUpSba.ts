import { generateAIResponse, QuestionContext } from './openai';

export type FollowUpSbaMode = 'application' | 'transfer' | 'prerequisite' | 'discriminator';
export type TeachingEvidenceMode = 'guided' | 'independent';

export type FollowUpSbaOption = {
  id: string;
  text: string;
};

export type StructuredComparisonObject = {
  type: 'comparison';
  leftTitle: string;
  rightTitle: string;
  rows: Array<{
    feature: string;
    left: string;
    right: string;
  }>;
  takeaway?: string;
};

export type StructuredTransferCase = {
  type: 'transfer_case';
  vignette: string;
  question: string;
};

export type StructuredWhatChangedObject = {
  type: 'what_changed';
  changes: Array<{
    from: string;
    to: string;
  }>;
  takeaway: string;
};

export type StructuredFollowUpSba = {
  id: string;
  stem: string;
  options: FollowUpSbaOption[];
  correctAnswerId: string;
  rationale: string;
  teachingObjective: string;
  mode: FollowUpSbaMode;
  evidenceMode: TeachingEvidenceMode;
  comparison?: StructuredComparisonObject;
  transferCase?: StructuredTransferCase;
  whatChanged?: StructuredWhatChangedObject;
  qa: {
    passed: true;
    attempts: number;
    checker: 'automated';
    version: 'followup-sba-v3';
  };
};

export type FollowUpSbaRequest = {
  mode: FollowUpSbaMode;
  teachingObjective: string;
  avoidStems?: string[];
};

type CandidateFollowUpSba = {
  stem: string;
  options: FollowUpSbaOption[];
  correctAnswerId: string;
  rationale: string;
  teachingObjective: string;
  comparison?: StructuredComparisonObject;
  transferCase?: StructuredTransferCase;
  whatChanged?: StructuredWhatChangedObject;
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

function cleanText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normaliseOptionId(value: unknown): string {
  return cleanText(value).toUpperCase();
}

function parseComparison(value: any): StructuredComparisonObject | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const leftTitle = cleanText(value.leftTitle);
  const rightTitle = cleanText(value.rightTitle);
  const rows = Array.isArray(value.rows)
    ? value.rows
        .map((row: any) => ({
          feature: cleanText(row?.feature),
          left: cleanText(row?.left),
          right: cleanText(row?.right),
        }))
        .filter((row: any) => row.feature && row.left && row.right)
        .slice(0, 4)
    : [];
  if (!leftTitle || !rightTitle || rows.length < 2) return undefined;
  const takeaway = cleanText(value.takeaway);
  return { type: 'comparison', leftTitle, rightTitle, rows, ...(takeaway ? { takeaway } : {}) };
}

function parseTransferCase(value: any): StructuredTransferCase | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const vignette = cleanText(value.vignette);
  const question = cleanText(value.question);
  if (vignette.length < 30 || question.length < 12 || !question.endsWith('?')) return undefined;
  return { type: 'transfer_case', vignette, question };
}

function parseWhatChanged(value: any): StructuredWhatChangedObject | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const changes = Array.isArray(value.changes)
    ? value.changes
        .map((change: any) => ({ from: cleanText(change?.from), to: cleanText(change?.to) }))
        .filter((change: any) => change.from && change.to)
        .slice(0, 5)
    : [];
  const takeaway = cleanText(value.takeaway);
  if (changes.length < 1 || !takeaway) return undefined;
  return { type: 'what_changed', changes, takeaway };
}

function parseCandidate(raw: string, request: FollowUpSbaRequest): CandidateFollowUpSba | null {
  try {
    const parsed = extractJson(raw) as any;
    const stem = cleanText(parsed?.stem);
    const options = Array.isArray(parsed?.options)
      ? parsed.options.map((option: any) => ({
          id: normaliseOptionId(option?.id),
          text: cleanText(option?.text),
        }))
      : [];
    const correctAnswerId = normaliseOptionId(parsed?.correctAnswerId);
    const rationale = cleanText(parsed?.rationale);
    const teachingObjective = cleanText(parsed?.teachingObjective || request.teachingObjective);
    const comparison = parseComparison(parsed?.comparison);
    const transferCase = parseTransferCase(parsed?.transferCase);
    const whatChanged = parseWhatChanged(parsed?.whatChanged);

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
    if (request.mode === 'transfer' && (!transferCase || !whatChanged || comparison)) return null;
    if (request.mode !== 'transfer' && (transferCase || whatChanged)) return null;

    return {
      stem,
      options,
      correctAnswerId,
      rationale,
      teachingObjective,
      ...(comparison ? { comparison } : {}),
      ...(transferCase ? { transferCase } : {}),
      ...(whatChanged ? { whatChanged } : {}),
    };
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
        ? parsed.issues.map((issue: unknown) => cleanText(issue)).filter(Boolean).slice(0, 8)
        : [],
    };
  } catch {
    return { pass: false, issues: ['QA response was not valid JSON.'] };
  }
}

function candidateJson(candidate: CandidateFollowUpSba): string {
  return JSON.stringify(candidate, null, 2);
}

function avoidedQuestionText(request: FollowUpSbaRequest): string {
  const stems = (request.avoidStems || []).map(cleanText).filter(Boolean).slice(-4);
  if (!stems.length) return '';
  return `\nDO NOT REPEAT THESE PREVIOUS CHECKS OR TEST THE SAME THING WITH COSMETIC CHANGES:\n- ${stems.join('\n- ')}\n`;
}

function objectInstructions(mode: FollowUpSbaMode): string {
  if (mode === 'transfer') {
    return `\nSTRUCTURED TEACHING OBJECTS REQUIRED FOR TRANSFER:\n- transferCase: a complete altered clinical vignette plus its question. It must require a genuinely different application of the SAME verified rule without highlighting or naming the decisive clue. Changing age, sex, drug name, timing, or other demographics alone does NOT count as transfer unless that change alters the reasoning required. If the learner could answer by repeating the exact same fact in the exact same way, it is not transfer.\n- whatChanged: internal QA metadata describing only clinically meaningful changes. It is not a learner-facing teaching requirement.\n- comparison: null. Independent transfer must not be scaffolded by a comparison before the answer.`;
  }

  if (mode === 'discriminator') {
    return `\nSTRUCTURED TEACHING OBJECTS FOR A MISCONCEPTION/PARTIAL MODEL:\n- comparison: include a quiet two-column comparison ONLY if the verified context fully supports both sides and it clarifies the learner's actual confusion. Use 2-4 matched features and keep every cell concise. If the context does not support a safe or useful comparison, return null.\n- transferCase: null.\n- whatChanged: null.`;
  }

  return `\nSTRUCTURED TEACHING OBJECTS:\n- comparison: null unless the verified context clearly supports two meaningful sides and comparison is necessary for the requested objective. If used, keep it to 2-4 concise matched features.\n- transferCase: null.\n- whatChanged: null.`;
}

function generatorPrompt(request: FollowUpSbaRequest, repairIssues: string[] = []): string {
  const modeRule = request.mode === 'transfer'
    ? 'Test independent transfer of the SAME verified discriminator. The learner must have to apply the rule in a meaningfully different way, not answer an isomorphic copy.'
    : request.mode === 'prerequisite'
      ? 'Test the smallest prerequisite or rule the learner needs in order to answer the verified current concept.'
      : request.mode === 'discriminator'
        ? 'Test the decisive discriminator that separates the correct answer from the learner’s plausible alternative.'
        : 'Test application of the verified explanation without merely repeating the original question.';

  const repair = repairIssues.length
    ? `\nThe previous candidate failed QA for these reasons. Fix ALL of them:\n- ${repairIssues.join('\n- ')}\n`
    : '';

  return `You are StudyEdit's structured follow-up SBA generator. Create ONE short, high-quality medical single-best-answer question from the VERIFIED CURRENT-QUESTION CONTEXT supplied separately.\n\nTeaching objective: ${request.teachingObjective}\nMode: ${request.mode}\n${modeRule}${objectInstructions(request.mode)}${avoidedQuestionText(request)}${repair}\n\nNON-NEGOTIABLE RULES:\n- Use ONLY medical facts contained in the verified current-question context. Do not rely on outside knowledge to make the keyed answer true.\n- There must be exactly ONE unambiguously best answer.\n- Return exactly four options labelled A, B, C, D.\n- The keyed answer must be directly supported by the verified explanation/key fact/distractor feedback.\n- Distractors must be plausible enough to diagnose reasoning, but clearly wrong from the same verified context.\n- Do not use “all of the above”, “none of the above”, trick wording, double negatives, or trivia.\n- Avoid answer-position, grammar, length, or wording clues.\n- Do not simply restate the original question or a previous follow-up.\n- Do not create an apparently new case by merely swapping demographics, antibiotic names, dates, or other irrelevant details while testing the identical recall step.\n- Keep the stem concise and clinically meaningful.\n- The rationale must explain why the keyed answer is uniquely best using only the supplied verified context.\n- Never fabricate a comparison, altered case, or changed variable merely to satisfy the schema.\n- For every mode except transfer, transferCase and whatChanged MUST be null.\n- For transfer mode, comparison MUST be null.\n\nReturn JSON ONLY in exactly this shape:\n{\n  "stem": "Question ending in ?",\n  "options": [\n    {"id":"A","text":"..."},\n    {"id":"B","text":"..."},\n    {"id":"C","text":"..."},\n    {"id":"D","text":"..."}\n  ],\n  "correctAnswerId": "A",\n  "rationale": "...",\n  "teachingObjective": "...",\n  "comparison": null OR {\n    "leftTitle":"...",\n    "rightTitle":"...",\n    "rows":[{"feature":"...","left":"...","right":"..."}],\n    "takeaway":"optional concise distinction"\n  },\n  "transferCase": null OR {\n    "vignette":"complete altered vignette",\n    "question":"question ending in ?"\n  },\n  "whatChanged": null OR {\n    "changes":[{"from":"...","to":"..."}],\n    "takeaway":"internal concise discriminator"\n  }\n}`;
}

function qaPrompt(candidate: CandidateFollowUpSba, request: FollowUpSbaRequest): string {
  return `You are the independent StudyEdit follow-up SBA and teaching-object quality checker. Judge the candidate ONLY against the VERIFIED CURRENT-QUESTION CONTEXT supplied separately.\n\nRequested teaching objective: ${request.teachingObjective}\nRequested mode: ${request.mode}${avoidedQuestionText(request)}\nCANDIDATE:\n${candidateJson(candidate)}\n\nReject the candidate if ANY of these are true:\n1. The keyed answer is not directly entailed by the verified context.\n2. More than one option could reasonably be correct.\n3. A distractor is medically unsupported or requires outside knowledge to rule out.\n4. The question tests something other than the requested teaching objective.\n5. The stem, options, comparison, transfer case, what-changed object, or rationale introduces a clinically important fact not supported by the verified context.\n6. The correct answer is cued by wording, grammar, option length, absolutes, obvious implausibility, highlighting, or a teaching object shown before the answer.\n7. It is effectively the same cognitive task as the original or any previous follow-up, including when only age, sex, drug name, timing, or other superficial vignette details have changed.\n8. The rationale does not justify why the keyed option is uniquely best.\n9. The wording is ambiguous, unsafe, misleading, or not appropriate for a UK medical learner.\n10. A comparison claims a difference that the verified context does not explicitly support on BOTH sides, or is included without adding useful discrimination.\n11. For transfer mode: the case does not require a meaningfully different application of the rule, or the learner could answer by simply repeating the exact same fact from the previous check.\n12. For transfer mode: a comparison or other scaffold reveals the answer before independent retrieval.\n13. The whatChanged metadata adds a new medical rule rather than describing supported structure.\n14. For any non-transfer mode: transferCase or whatChanged is present.\n15. For transfer mode: comparison is present.\n\nReturn JSON ONLY:\n{"pass": true, "issues": []}\nor\n{"pass": false, "issues": ["specific issue", "specific issue"]}`;
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
      candidate = parseCandidate(generated, request);
    } catch (error) {
      console.warn('StudyEdit follow-up SBA generation failed:', error);
    }

    if (!candidate) {
      repairIssues = request.mode === 'transfer'
        ? ['Return valid JSON with exactly four A-D options plus a fully grounded, genuinely non-isomorphic transferCase and whatChanged metadata. Do not invent unsupported clinical facts.']
        : ['Return the required valid JSON structure with exactly four A-D options and one keyed answer. Do not include transferCase or whatChanged.'];
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
        evidenceMode: request.mode === 'transfer' ? 'independent' : 'guided',
        qa: {
          passed: true,
          attempts: attempt,
          checker: 'automated',
          version: 'followup-sba-v3',
        },
      };
    }

    repairIssues = qa.issues.length ? qa.issues : ['The candidate did not pass the quality gate.'];
  }

  return null;
}
