import { QuestionTemplate, UkmlaQuestion } from "../types/dynamicQuestions";
import { generateQuestionExplanation } from "./generateExplanation";
import { buildHypertensionExplanationData, generateConciseExplanation } from "./generateConciseExplanation";

/**
 * Generates a random question from a template by filling in variables
 * and determining the correct answer based on template logic
 */
export function generateRandomQuestion(template: QuestionTemplate): UkmlaQuestion {
  // Helper function to randomly select an item from an array
  const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  // Generate a unique ID for the question
  const id = `dynamic-${template.templateId}-${Date.now()}`;
  
  // Create a map to store selected variable values for consistency
  const selectedVariables: Record<string, string> = {};
  
  // Select random values for all variables
  Object.keys(template.variables).forEach(key => {
    selectedVariables[key] = randomPick(template.variables[key]);
  });
  
  // Function to recursively replace all variables in a string, optionally bolding keys
  const replaceVariables = (text: string, boldKeys?: string[]): string => {
    let result = text;
    let madeReplacement = false;

    // Replace all direct variables
    Object.entries(selectedVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${key}\\]`, "g");
      if (regex.test(result)) {
        const v = boldKeys && boldKeys.includes(key) ? `**${value}**` : value;
        result = result.replace(regex, v);
        madeReplacement = true;
      }
    });

    // If we made any replacements, do another pass to catch nested variables
    return madeReplacement ? replaceVariables(result, boldKeys) : result;
  };

  // Narrative composition helpers when template provides pools
  const boldKeys = template.templateStyle?.boldKeys || [];
  const pick = <T>(arr?: T[]): T | undefined => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined);

  const buildNarrativeStem = (): string | null => {
    const hasNarrative = !!(template.narrative || template.clinical);
    if (!hasNarrative) return null;

    const setting = pick(template.narrative?.settingPool);
    const time = pick(template.narrative?.timePool);
    const reason = pick(template.narrative?.reasonForAttendancePool);
    const symptom = pick(template.clinical?.symptomsPool);
    const exam = pick(template.clinical?.examPool);

    const gender = selectedVariables["GENDER"]; // optional
    const pronoun = gender === "woman" ? "She" : "He";

    const parts: string[] = [];
    parts.push(replaceVariables(`A [AGE]-year-old [GENDER] attends the ${setting || 'clinic'} ${time ? time : ''} for ${reason || 'a review'}.`, boldKeys));
    if (selectedVariables["OCCUPATION"]) {
      parts.push(replaceVariables(`${pronoun} works as a [OCCUPATION].`, boldKeys));
    }
    if (selectedVariables["DURATION"]) {
      parts.push(replaceVariables(`${pronoun} has a [DURATION] history of hypertension.`, boldKeys));
    }
    parts.push(replaceVariables(`Current medications include [CURRENT_ACE_ARB], [CURRENT_CCB], and [CURRENT_DIURETIC].`, boldKeys));
    if (selectedVariables["BP_READING"]) {
      parts.push(replaceVariables(`Blood pressure today is [BP_READING] mmHg.`, boldKeys));
    }
    if (symptom) {
      parts.push(`${pronoun} reports ${symptom}.`);
    }
    if (selectedVariables["ADHERENCE"]) {
      parts.push(replaceVariables(`${pronoun} reports [ADHERENCE] with medication.`, boldKeys));
    }
    if (selectedVariables["LIFESTYLE"]) {
      parts.push(replaceVariables(`Lifestyle: [LIFESTYLE].`, boldKeys));
    }

    const labBits: string[] = [];
    if (selectedVariables["SODIUM"]) labBits.push(replaceVariables(`sodium [SODIUM] mmol/L`, boldKeys));
    if (selectedVariables["POTASSIUM"]) labBits.push(replaceVariables(`potassium [POTASSIUM] mmol/L`, boldKeys));
    if (selectedVariables["CREATININE"]) labBits.push(replaceVariables(`creatinine [CREATININE] μmol/L`, boldKeys));
    if (selectedVariables["EGFR"]) labBits.push(replaceVariables(`eGFR [EGFR] mL/min/1.73m²`, boldKeys));
    if (labBits.length) {
      parts.push(`Recent blood tests show ${labBits.join(', ')}.`);
    }
    if (exam) {
      parts.push(`On examination: ${exam}.`);
    }

    let narrative = parts.join(' ');

    const maxWords = template.templateStyle?.maxWords;
    if (maxWords) {
      const words = narrative.split(/\s+/);
      if (words.length > maxWords) {
        narrative = words.slice(0, maxWords).join(' ') + '…';
      }
    }

    if (template.template.questionText) {
      narrative += `\n\n${replaceVariables(template.template.questionText, boldKeys)}`;
    }

    return narrative;
  };

  // Determine stem: narrative if possible, else fallback to template stem
  let stem = buildNarrativeStem() || replaceVariables(template.template.stem, boldKeys);
  
  // Add question text if provided separately
  if (template.template.questionText) {
    let questionText = replaceVariables(template.template.questionText);
    stem = `${stem}\n\n${questionText}`;
  }
  
  // Process options with variable replacements
  const processedOptions = template.template.options.map(option => {
    return replaceVariables(option);
  });
  
  // Determine the correct answer based on the logic type
  let correctAnswerIndex = 0;
  
  switch (template.correctAnswerLogic.type) {
    case "fixed":
      // Use the predefined correct answer index
      correctAnswerIndex = template.correctAnswerLogic.value || 0;
      break;
      
    case "conditional":
      // Check conditions to determine the correct answer
      if (template.correctAnswerLogic.conditions) {
        for (const condition of template.correctAnswerLogic.conditions) {
          if (condition.values.includes(selectedVariables[condition.variableKey])) {
            correctAnswerIndex = condition.resultIndex;
            break;
          }
        }
      }
      break;
      
    case "calculation":
      // For complex logic, we would call a registered function
      // This is a simplified implementation
      console.warn("Calculation logic type requires custom implementation");
      correctAnswerIndex = 0;
      break;
  }
  
  // Generate explanation using the concise explanation generator
  let explanation = '';
  
  // Use template-specific explanation builder based on template ID
  if (template.templateId.startsWith('HTN')) {
    // For hypertension templates, use the specialized builder
    const explanationData = buildHypertensionExplanationData(
      selectedVariables,
      correctAnswerIndex,
      processedOptions
    );
    
    // Generate the concise explanation
    explanation = generateConciseExplanation(explanationData);
  } else {
    // For other templates, use the generic explanation generator
    // First, prepare additional variables for the explanation
    const explanationVariables = {
      ...selectedVariables,
      GUIDELINE_NAME: template.guideline?.name || '',
      GUIDELINE_YEAR: template.guideline?.year || '',
      GUIDELINE_TITLE: template.guideline?.title || '',
      GUIDELINE_RECOMMENDATION: template.guideline?.keyRecommendation || '',
      CORRECT_OPTION: processedOptions[correctAnswerIndex],
      CORRECT_OPTION_INDEX: correctAnswerIndex
    };
    
    // Generate the explanation using the original generator
    explanation = generateQuestionExplanation(
      {
        id,
        section: template.section,
        topic: template.topic,
        microSkill: template.microSkill,
        difficulty: template.difficulty,
        content: stem,
        options: processedOptions,
        correctAnswer: correctAnswerIndex,
        explanation: '', // Will be filled by generateQuestionExplanation
        timeLimit: template.timeLimit
      },
      explanationVariables,
      template.explanationTemplate
    );
    
    // Add guideline information if not already included in the explanation
    if (template.guideline && !explanation.includes(template.guideline.name)) {
      const guidelineInfo = `\n\n### Guideline Reference:\n* **${template.guideline.name}** (${template.guideline.year}): ${template.guideline.title}\n* **Key Recommendation**: ${template.guideline.keyRecommendation}`;
      explanation += guidelineInfo;
    }
  }
  
  // Return the question in the format expected by the existing app
  return {
    id,
    section: template.section,
    topic: template.topic,
    microSkill: template.microSkill,
    difficulty: template.difficulty,
    content: stem,
    options: processedOptions,
    correctAnswer: correctAnswerIndex,
    explanation,
    timeLimit: template.timeLimit
  };
}

/**
 * Optional: Enhanced version that can use AI to improve question quality
 * This would require integration with an AI service like OpenAI
 */
export async function generateEnhancedQuestion(
  template: QuestionTemplate, 
  aiService?: any
): Promise<UkmlaQuestion> {
  // First generate the basic question
  const baseQuestion = generateRandomQuestion(template);
  
  // If AI enhancement is not enabled or no AI service is provided, return the base question
  if (!template.aiEnhancement?.enabled || !aiService) {
    return baseQuestion;
  }
  
  try {
    // Enhance the stem if a stem prompt is provided
    if (template.aiEnhancement.stemPrompt) {
      const enhancedStem = await aiService.generateText({
        prompt: template.aiEnhancement.stemPrompt
          .replace('[STEM]', baseQuestion.content),
        maxTokens: 500
      });
      
      if (enhancedStem) {
        baseQuestion.content = enhancedStem;
      }
    }
    
    // Enhance the explanation if an explanation prompt is provided
    if (template.aiEnhancement.explanationPrompt) {
      const enhancedExplanation = await aiService.generateText({
        prompt: template.aiEnhancement.explanationPrompt
          .replace('[EXPLANATION]', baseQuestion.explanation),
        maxTokens: 1000
      });
      
      if (enhancedExplanation) {
        baseQuestion.explanation = enhancedExplanation;
      }
    }
    
    return baseQuestion;
  } catch (error) {
    console.error("AI enhancement failed:", error);
    // Fall back to the base question if AI enhancement fails
    return baseQuestion;
  }
}
