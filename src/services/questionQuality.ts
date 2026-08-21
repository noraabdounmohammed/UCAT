import type { ConceptNode } from '@/types/conceptTypes';

export const UKMLA_QUALITY_INSTRUCTIONS = `You are writing a UK Medical Licensing Assessment (MLA) Applied Knowledge Test single-best-answer item.

The item must test APPLIED clinical knowledge, not recognition of a buzzword or recall of an isolated sentence.

ITEM BLUEPRINT — decide this before writing:
- Test ONE clinically meaningful decision.
- Pick one cognitive task: diagnosis, next investigation, initial management, medication choice, mechanism, anatomy, or causative organism.
- Build the correct answer first.
- Build four distractors that represent realistic near-miss decisions or misconceptions, not random wrong answers.
- Difficulty should come from clinical discrimination, NOT obscure trivia, hidden assumptions, deliberately deceptive wording, or an implausibly rare exception.
- If the source concept is merely a factual property (for example route of administration, half-life, mechanism, one adverse effect, or one score component), DO NOT disguise that fact as a patient-management decision. Test the fact directly or generate a simple application that does not require invented management guidance.
- Never turn a thin factual concept into a treatment-selection question unless the supplied source explicitly supports the treatment decision and the competing options.

VIGNETTE (the "vignette" field):
- Start with age + gender where clinically appropriate.
- Use short readable paragraphs separated by a blank line:
  Paragraph 1: presentation and relevant history.
  Paragraph 2: examination and observations, if relevant.
  Paragraph 3: investigations/results, if relevant.
  Paragraph 4: treatment or subsequent clinical change, if relevant.
- Do not put the lead-in question inside the vignette.
- Include only information that belongs naturally in the case. Do NOT make every detail a giveaway.
- Usually only one or two features should be truly discriminative; other details may establish realistic context.
- Avoid classic buzzwords when a more natural clinical description can test the same reasoning.
- Never split phrases such as "On examination" or "Cardiovascular examination" across paragraphs.
- Reference ranges are required for laboratory values when interpretation depends on whether the value is abnormal. Do not add pointless reference ranges to ordinary observations such as heart rate, BP or oxygen saturation.
- For medication-management questions, include every clinically relevant discriminator needed to choose safely between the options, such as indication, renal function, haemodynamic status, bleeding history, pregnancy status, prior adverse reactions, planned PCI/thrombolysis, or interacting antithrombotic treatment when relevant.

LEAD-IN (the "question" field):
- One short, direct sentence outside the vignette and ending with "?".
- It must be answerable in principle before seeing the options (the cover test).
- Natural UKMLA-style variants are allowed. Examples include:
  "What is the most likely diagnosis?"
  "Which investigation is most appropriate now?"
  "What is the most appropriate initial management?"
  "Which drug should be stopped?"
  "What is the most likely underlying mechanism?"
- Do not repeat the lead-in inside the vignette.
- Do not ask a management question when the source concept only supports a descriptive fact.

OPTIONS:
- Exactly 5 options, IDs A–E.
- All options must belong to the same semantic category and answer the lead-in grammatically.
- Keep options concise and similar in style/length.
- Every distractor must be clinically plausible before the decisive clue is applied.
- No "all of the above", "none of the above", joke options, obvious opposites, or one conspicuously detailed option.
- Exactly ONE option must be defensibly best from the information given.
- If two options are both true statements about the concept, rewrite the lead-in so only one answers the question, or replace one option.
- Do not create distractors by asserting that a real property of a drug, score or disease is false.

ANTI-PATTERN-RECOGNITION:
- Do not make the diagnosis obvious from one famous buzzword alone.
- Do not reproduce the concept title verbatim in the vignette unless clinically unavoidable.
- Make the student integrate at least two pieces of information whenever the source content supports it.
- Prefer realistic competing diagnoses/actions over obscure trivia.
- Avoid gratuitous "sausage-shaped", "tumour plop", "tearing" or similar textbook labels when the same concept can be tested with natural findings; if such a clue is used, do not let it be the only discriminating evidence.

OUTPUT JSON — return exactly this shape:
{
  "vignette": "clinical vignette with blank lines between clinical sections",
  "question": "one short lead-in ending in ?",
  "options": [
    {"id":"A","text":"..."},
    {"id":"B","text":"..."},
    {"id":"C","text":"..."},
    {"id":"D","text":"..."},
    {"id":"E","text":"..."}
  ],
  "correct": "A",
  "key_fact": "one concise standalone carry-forward fact",
  "explanation": "Explain why the correct answer is best and why each realistic alternative is not best here.",
  "blueprint": {
    "task": "diagnosis|investigation|management|medication|mechanism|anatomy|organism",
    "reasoning": "the clinical discrimination being tested",
    "decisive_clues": ["clue 1", "clue 2"],
    "distractor_intents": {
      "A": "correct or misconception represented",
      "B": "correct or misconception represented",
      "C": "correct or misconception represented",
      "D": "correct or misconception represented",
      "E": "correct or misconception represented"
    }
  }
}

Use only facts supported by the supplied concept content. If the source content is too thin to support a fair applied item, prefer a simple factual/application question over inventing unsupported clinical management detail.`;

export interface QuestionQualityResult {
  pass: boolean;
  score: number;
  reasons: string[];
}

const normalise = (value: unknown) => String(value ?? '').trim();

export function validateUKMLAQuestion(question: any): QuestionQualityResult {
  const reasons: string[] = [];
  const vignette = normalise(question?.clinical_vignette ?? question?.vignette);
  const leadIn = normalise(question?.question);
  const options = Array.isArray(question?.options) ? question.options : [];
  const correct = normalise(question?.correct_answer ?? question?.correct).toUpperCase();

  if (!vignette || vignette.length < 35) reasons.push('Missing or implausibly short clinical vignette.');
  if (!leadIn || !leadIn.endsWith('?') || leadIn.length > 180) reasons.push('Lead-in must be one short question ending in ?.');
  if (leadIn && vignette.toLowerCase().includes(leadIn.toLowerCase())) reasons.push('Lead-in is duplicated inside the vignette.');
  if (options.length !== 5) reasons.push('UKMLA SBA must contain exactly five options.');

  const expectedIds = ['A', 'B', 'C', 'D', 'E'];
  const optionIds = options.map((option: any) => normalise(option?.id).toUpperCase());
  if (optionIds.length === 5 && expectedIds.some((id, index) => optionIds[index] !== id)) reasons.push('Option IDs must be A–E in order.');
  if (!expectedIds.includes(correct)) reasons.push('Correct answer must be one of A–E.');
  if (correct && !optionIds.includes(correct)) reasons.push('Correct answer does not match an option ID.');

  const texts = options.map((option: any) => normalise(typeof option === 'string' ? option : option?.text));
  if (texts.some((text: string) => !text)) reasons.push('Every option needs text.');
  const uniqueTexts = new Set(texts.map((text: string) => text.toLowerCase()));
  if (texts.length && uniqueTexts.size !== texts.length) reasons.push('Duplicate answer options detected.');
  if (texts.some((text: string) => /\b(?:all|none) of the above\b/i.test(text))) reasons.push('All/none-of-the-above options are not allowed.');

  const lengths = texts.filter(Boolean).map((text: string) => text.length);
  if (lengths.length === 5) {
    const min = Math.max(1, Math.min(...lengths));
    const max = Math.max(...lengths);
    if (max > 70 && max / min > 3.2) reasons.push('One option is conspicuously longer than the others and may cue the answer.');
  }

  if (leadIn && /\b(?:except|not true|least likely)\b/i.test(leadIn)) reasons.push('Negative lead-ins are avoided because they add test-taking difficulty rather than clinical reasoning.');
  if (vignette && /\b(?:pathognomonic|classic triad|textbook presentation)\b/i.test(vignette)) reasons.push('Vignette contains overt cueing language.');

  const score = Math.max(0, 100 - reasons.length * 18);
  return { pass: reasons.length === 0, score, reasons };
}

async function callReviewer(prompt: string): Promise<any> {
  const response = await fetch('/.netlify/functions/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are a hostile reviewer for a national medical licensing exam. Reject ambiguous, cueable, unfair, unsupported, trivial, or clinically unsafe questions. Check every option independently for truth and defensibility. Do not reward eloquent wording. Respond with valid JSON only.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) throw new Error(`Question reviewer failed: ${response.status}`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Question reviewer returned no content');
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Question reviewer returned invalid JSON');
  return JSON.parse(match[0]);
}

export async function reviewUKMLAQuestion(question: any, concept: ConceptNode): Promise<QuestionQualityResult> {
  const deterministic = validateUKMLAQuestion(question);
  if (!deterministic.pass) return deterministic;

  const prompt = `Review this proposed UKMLA SBA against the supplied source concept.

SOURCE CONCEPT
Title: ${concept.title}
Content: ${concept.content || ''}

QUESTION
Vignette: ${normalise(question?.clinical_vignette ?? question?.vignette)}
Lead-in: ${normalise(question?.question)}
Options: ${JSON.stringify(question?.options || [])}
Claimed correct answer: ${normalise(question?.correct_answer ?? question?.correct)}
Explanation: ${normalise(question?.explanation)}

Score these dimensions:
- clinical/source accuracy: 25
- single-best-answer integrity: 20
- distractor plausibility: 15
- applied reasoning rather than recall: 15
- clinical realism: 10
- resistance to cueing/pattern recognition: 5
- clarity: 5
- fairness: 5

Before scoring, explicitly test every answer option independently:
1. Is the statement/action itself clinically true?
2. Could it reasonably answer this lead-in in this patient?
3. Is any claimed distinction dependent on context absent from the stem?
4. Does the explanation dismiss a true alternative merely because the source concept did not mention it?

MANDATORY REJECTION if:
- more than one option is reasonably defensible from the information given
- the claimed correct answer is unsupported by the supplied concept
- the vignette relies on an invented fact that changes the answer
- management could be clinically unsafe
- difficulty is mainly obscurity or trick wording
- the answer is given away by buzzwords or option construction
- a descriptive source fact has been disguised as a treatment/management decision
- the item requires choosing between medicines but omits context needed to determine the preferred agent
- the explanation says an alternative is wrong merely because the source content did not mention it
- an option claimed to be false is actually a true property of the drug, score, disease, investigation, or treatment

Return ONLY:
{
  "pass": true,
  "score": 0,
  "reasons": ["short concrete reason"],
  "ambiguous_options": [],
  "unsafe": false
}

Pass only if score >= 88 and there is no mandatory rejection.`;

  try {
    const review = await callReviewer(prompt);
    const score = Number(review?.score || 0);
    const reasons = Array.isArray(review?.reasons) ? review.reasons.map((reason: unknown) => normalise(reason)).filter(Boolean) : [];
    const ambiguous = Array.isArray(review?.ambiguous_options) ? review.ambiguous_options : [];
    const unsafe = Boolean(review?.unsafe);
    const pass = Boolean(review?.pass) && score >= 88 && !unsafe && ambiguous.length === 0;
    return { pass, score, reasons: reasons.length ? reasons : pass ? [] : ['Adversarial reviewer did not approve this item.'] };
  } catch (error) {
    console.warn('Question reviewer unavailable; accepting only deterministic validation.', error);
    return deterministic;
  }
}
