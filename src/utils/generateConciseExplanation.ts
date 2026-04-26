import { QuestionData } from "../types/explanationTypes";

/**
 * Generates a concise, structured explanation for UKMLA questions
 * 
 * @param data Question data with all required fields for explanation generation
 * @returns A formatted explanation string
 */
export function generateConciseExplanation(data: QuestionData): string {
  // Build distractor list with bullet points
  const distractorText = data.distractors
    .map((d) => `- **${d.name}:** ${d.reason}`)
    .join("\n");

  // Format medications list
  const medicationsText = data.medications.join(", ");
  
  // Default monitoring timeframe if not provided
  const monitoringTimeframe = data.monitoringTimeframe || "2 weeks";
  
  // Format side effects
  const sideEffectsText = data.sideEffects.join(", ");
  
  // Build the explanation using the template
  return `
**Correct Answer:** **${data.correctAnswer}**

**Why:**  
This patient has **${data.condition}**: BP remains **${data.bp}** despite ${medicationsText}.  
According to **${data.guidelineName} (${data.guidelineYear})**, the recommended next step is **${data.correctAnswer}** because ${data.primaryReason}.  

**Why Other Options Are Wrong:**  
${distractorText}

**Monitoring:**  
- Check **renal function and electrolytes in ${monitoringTimeframe}** (risk: ${data.monitoringRisk})  
- Repeat BP in **4 weeks**  
- Educate on potential side effects (${sideEffectsText})  

**Key Takeaway:**  
*${data.keyPoint}*
  `.trim();
}

/**
 * Builds a QuestionData object for hypertension questions based on question variables
 * 
 * @param variables Variables from the question template
 * @param correctAnswerIndex Index of the correct answer
 * @param options Array of answer options
 * @returns QuestionData object for explanation generation
 */
export function buildHypertensionExplanationData(
  variables: Record<string, any>,
  correctAnswerIndex: number,
  options: string[]
): QuestionData {
  // Extract key variables
  const age = variables.AGE;
  const gender = variables.GENDER;
  const bp = variables.BP_READING;
  const potassium = parseFloat(variables.POTASSIUM);
  const aceArb = variables.CURRENT_ACE_ARB;
  const ccb = variables.CURRENT_CCB;
  const diuretic = variables.CURRENT_DIURETIC;
  
  // Determine correct answer and build distractor list
  const correctAnswer = options[correctAnswerIndex];
  const distractors = options
    .filter((_, index) => index !== correctAnswerIndex)
    .map(option => {
      let reason = "";
      
      // Assign reasons based on option content
      if (option.includes("spironolactone") && potassium >= 4.5) {
        reason = "contraindicated with potassium of " + potassium + " mmol/L (risk of dangerous hyperkalemia)";
      } else if (option.includes("doxazosin") && potassium < 4.5) {
        reason = "less effective than spironolactone for resistant hypertension (PATHWAY-2 trial)";
      } else if (option.includes("bisoprolol") || option.includes("beta-blocker")) {
        reason = "not guideline-preferred fourth-line agent for hypertension";
      } else if (option.toLowerCase().includes("increase") || option.toLowerCase().includes("dose")) {
        reason = "already at maximum dose; adding a fourth agent is more effective";
      } else if (option.toLowerCase().includes("switch")) {
        reason = "lateral switch within same class unlikely to provide significant benefit";
      } else {
        reason = "not the optimal choice based on current guidelines";
      }
      
      return { name: option, reason };
    });
  
  // Determine primary reason based on potassium level
  const primaryReason = potassium >= 4.5
    ? `doxazosin is appropriate when potassium is elevated (${potassium} mmol/L), as spironolactone would increase hyperkalemia risk`
    : `potassium is ${potassium} mmol/L, below the 4.5 mmol/L cutoff for hyperkalemia risk`;
  
  // Determine monitoring risk based on correct answer
  const monitoringRisk = correctAnswer.includes("spironolactone") 
    ? "hyperkalemia with spironolactone"
    : "postural hypotension with doxazosin";
  
  // Determine side effects based on correct answer
  const sideEffects = correctAnswer.includes("spironolactone")
    ? ["gynecomastia", "hyperkalemia"]
    : ["dizziness", "postural hypotension"];
  
  // Build the QuestionData object
  return {
    correctAnswer,
    condition: "resistant hypertension",
    bp,
    medications: [aceArb, ccb, diuretic],
    guidelineName: "NICE NG136",
    guidelineYear: "2019",
    primaryReason,
    distractors,
    potassium,
    monitoringRisk,
    sideEffects,
    keyPoint: "In resistant hypertension, add spironolactone if potassium <4.5 mmol/L; use an alpha-blocker if potassium is ≥4.5 mmol/L (NICE NG136)."
  };
}

/**
 * Helper function to extract medication names from options
 */
export function extractMedicationFromOption(option: string): string {
  // Extract medication name from option text
  const matches = option.match(/Add|Switch to|Increase dose of|Start|Prescribe\s+([a-zA-Z\s-]+)/i);
  if (matches && matches[1]) {
    return matches[1].trim();
  }
  return option;
}
