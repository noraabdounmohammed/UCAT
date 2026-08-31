export type TutorConfidence = 'know' | 'unsure' | 'guess';

export interface TutorOpening {
  mode: 'move_on' | 'probe_reasoning' | 'teach_foundation';
  instruction: string;
  loadingLabel: string;
}

/**
 * First pedagogical move after an SBA answer.
 * Keep this deterministic: the model writes the turn, but StudyEdit owns the policy.
 */
export function chooseTutorOpening(correct: boolean, confidence: TutorConfidence | null): TutorOpening {
  const groundRules = [
    'Use only the verified current-question context as clinical ground truth.',
    'Do not invent why the learner chose an option.',
    'Do not invent prior patterns.',
    'Do not give a long explanation unless this policy explicitly asks you to teach.',
    'Sound like an excellent private medical tutor, not a question-bank explanation.',
  ].join(' ');

  if (correct && confidence === 'know') {
    return {
      mode: 'move_on',
      loadingLabel: 'Checking the key discriminator…',
      instruction: `${groundRules} The learner was correct and said they knew it. Confirm the decisive clue in no more than two short sentences. Do not interrogate them and do not reteach the topic.`,
    };
  }

  if (!correct && confidence === 'guess') {
    return {
      mode: 'teach_foundation',
      loadingLabel: 'Finding the smallest useful starting point…',
      instruction: `${groundRules} The learner was wrong and explicitly guessed. Do NOT ask why they chose the distractor because they have told us there may be no reasoning to inspect. Start from the smallest prerequisite needed for this question. Give at most one short orienting sentence, then ask ONE simple diagnostic/prerequisite question. Do not reveal the whole explanation yet.`,
    };
  }

  if (!correct && confidence === 'know') {
    return {
      mode: 'probe_reasoning',
      loadingLabel: 'Working out where the reasoning diverged…',
      instruction: `${groundRules} The learner was wrong but said they knew it. This may be a misconception. Do not explain the answer yet. In one natural sentence acknowledge the confidence, then ask them to talk you through how they got to their selected answer. Ask ONE question only.`,
    };
  }

  if (!correct && confidence === 'unsure') {
    return {
      mode: 'probe_reasoning',
      loadingLabel: 'Choosing the best first question…',
      instruction: `${groundRules} The learner was wrong and unsure. Do not explain the answer yet. Ask ONE concise, natural question to uncover what made them lean toward their selected option or what they were deciding between. Do not suggest a rationale yourself.`,
    };
  }

  if (correct && confidence === 'guess') {
    return {
      mode: 'probe_reasoning',
      loadingLabel: 'Checking whether this was knowledge or recognition…',
      instruction: `${groundRules} The learner was correct but explicitly guessed. Do not imply mastery. Do not explain yet. Ask ONE concise question: what made them choose this answer, if anything? Make it safe for them to say it was a pure guess.`,
    };
  }

  if (correct && confidence === 'unsure') {
    return {
      mode: 'probe_reasoning',
      loadingLabel: 'Checking what felt uncertain…',
      instruction: `${groundRules} The learner was correct but unsure. Do not give a full explanation yet. Ask ONE concise question about what made them lean toward the correct answer or what part they were unsure about.`,
    };
  }

  return {
    mode: 'teach_foundation',
    loadingLabel: 'Choosing the most useful next step…',
    instruction: `${groundRules} Confidence is unavailable. Give one short orienting sentence, then ask ONE diagnostic question that helps locate the learner's gap. Do not infer their reasoning.`,
  };
}

export function tutorReplyInstruction(previousTutorMessage: string): string {
  return [
    'Continue as a proactive private medical tutor.',
    previousTutorMessage ? `Your immediately previous tutor turn was: “${previousTutorMessage}”` : '',
    'Treat the learner’s latest message as evidence, not as proof of mastery.',
    'Respond to what they actually said; never invent unstated reasoning.',
    'Prefer the smallest useful teaching move: clarify one link, check one prerequisite, contrast one discriminator, or ask one Socratic question.',
    'Ask at most ONE question at the end of this turn.',
    'Do not dump a full textbook explanation unless the learner explicitly asks to just explain it.',
    'Use only the verified current-question context as clinical ground truth.',
  ].filter(Boolean).join(' ');
}
