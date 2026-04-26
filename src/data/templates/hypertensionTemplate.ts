import { QuestionTemplate } from "../../types/dynamicQuestions";

/**
 * Example template for hypertension management questions
 * This demonstrates how to create a question template with variable placeholders
 */
export const hypertensionTemplate: QuestionTemplate = {
  templateId: "HTN-001",
  section: "AKT",
  topic: "Cardiovascular System",
  microSkill: "Management",
  difficulty: "medium",
  
  // Style + narrative controls for a more engaging stem
  templateStyle: {
    maxWords: 120,
    boldKeys: ["BP_READING", "POTASSIUM", "CREATININE", "EGFR"]
  },
  narrative: {
    settingPool: ["the GP clinic", "the hypertension follow-up clinic", "pre-assessment clinic"],
    timePool: ["this morning", "yesterday", "earlier today"],
    reasonForAttendancePool: [
      "a medication review",
      "concerns about poor BP control despite adherence",
      "new side effects from treatment"
    ]
  },
  clinical: {
    symptomsPool: [
      "headaches over the past few weeks",
      "dizziness on standing",
      "ankle swelling",
      "a persistent dry cough",
      "no specific symptoms"
    ],
    examPool: [
      "no pedal oedema and a regular pulse",
      "trace ankle oedema",
      "no murmurs and normal heart sounds"
    ]
  },
  
  guideline: {
    name: "NICE",
    title: "Hypertension in adults: diagnosis and management",
    year: 2024,
    keyRecommendation: "Step 4 treatment should include an ACE inhibitor or ARB, a calcium channel blocker, and a thiazide-like diuretic before considering other options.",
    url: "https://www.nice.org.uk/guidance/ng136"
  },
  
  template: {
    stem: "A [AGE]-year-old [GENDER] with a [DURATION] history of hypertension attends for a medication review. Current medications include [CURRENT_MEDS]. Blood pressure today is [BP_READING] mmHg. The patient reports [SIDE_EFFECT] as a side effect. Recent blood tests show sodium [SODIUM] mmol/L, potassium [POTASSIUM] mmol/L, creatinine [CREATININE] μmol/L, and eGFR [EGFR] mL/min/1.73m².",
    questionText: "What is the most appropriate next step in management?",
    options: [
      "Add spironolactone",
      "Add doxazosin",
      "Add bisoprolol",
      "Increase dose of [CURRENT_CCB]",
      "Switch [CURRENT_ACE_ARB] to [ALTERNATIVE_ACE_ARB]"
    ]
  },
  
  variables: {
    "AGE": ["52", "58", "63", "67", "71"],
    "GENDER": ["man", "woman"],
    "DURATION": ["5-year", "8-year", "10-year"],
    "OCCUPATION": ["bus driver", "secondary school teacher", "accountant", "nurse", "warehouse worker"],
    "ADHERENCE": ["good adherence", "mostly good adherence", "occasional missed doses"],
    "LIFESTYLE": ["smokes 5 cigarettes/day", "drinks within recommended limits", "walks 30 minutes daily", "sedentary job"],
    "CURRENT_ACE_ARB": ["ramipril 10mg daily", "lisinopril 20mg daily", "candesartan 16mg daily", "losartan 100mg daily"],
    "CURRENT_CCB": ["amlodipine 10mg daily", "felodipine 10mg daily", "nifedipine MR 60mg daily"],
    "CURRENT_DIURETIC": ["indapamide 2.5mg daily", "bendroflumethiazide 2.5mg daily", "chlortalidone 25mg daily"],
    "CURRENT_MEDS": [
      "[CURRENT_ACE_ARB], [CURRENT_CCB], and [CURRENT_DIURETIC]", 
      "[CURRENT_CCB], [CURRENT_DIURETIC], and [CURRENT_ACE_ARB]",
      "[CURRENT_DIURETIC], [CURRENT_ACE_ARB], and [CURRENT_CCB]"
    ],
    "BP_READING": ["145/92", "152/94", "148/96", "158/98", "162/100"],
    "SIDE_EFFECT": ["occasional ankle swelling", "mild dizziness", "a dry cough", "headaches", "no side effects"],
    "SODIUM": ["138", "140", "142"],
    "POTASSIUM": ["3.8", "4.0", "4.2", "4.5", "4.8"],
    "CREATININE": ["78", "85", "92", "98", "105"],
    "EGFR": ["65", "72", "80", "85", "92"],
    "ALTERNATIVE_ACE_ARB": ["perindopril 8mg daily", "telmisartan 80mg daily", "valsartan 160mg daily"]
  },
  
  correctAnswerLogic: {
    type: "conditional",
    conditions: [
      {
        variableKey: "POTASSIUM",
        values: ["4.2", "4.5", "4.8"],
        resultIndex: 1 // Doxazosin (index 1) if potassium is elevated
      },
      {
        variableKey: "POTASSIUM",
        values: ["3.8", "4.0"],
        resultIndex: 0 // Spironolactone (index 0) if potassium is normal/low
      }
    ]
  },
  
  explanationTemplate: `### Patient Profile
* [AGE]-year-old [GENDER] with [DURATION] history of hypertension
* Current medications: [CURRENT_ACE_ARB], [CURRENT_CCB], and [CURRENT_DIURETIC]
* Blood pressure remains uncontrolled at [BP_READING] mmHg despite triple therapy
* Potassium level is [POTASSIUM] mmol/L

### Decision Rationale
[POTASSIUM >= 4.2]This patient has resistant hypertension (BP uncontrolled on optimal doses of three medications) with a potassium level of [POTASSIUM] mmol/L. Doxazosin is the appropriate fourth-line agent in this scenario as spironolactone would be contraindicated due to the risk of hyperkalemia with an already elevated potassium level.[/POTASSIUM >= 4.2][POTASSIUM < 4.2]This patient has resistant hypertension (BP uncontrolled on optimal doses of three medications) with a potassium level of [POTASSIUM] mmol/L. Spironolactone is the recommended fourth-line agent according to NICE guidelines when potassium levels are not elevated, as it provides superior blood pressure reduction compared to other fourth-line options.[/POTASSIUM < 4.2]

### Incorrect Options
* [POTASSIUM >= 4.2]Adding spironolactone: Contraindicated with potassium of [POTASSIUM] mmol/L due to risk of dangerous hyperkalemia[/POTASSIUM >= 4.2][POTASSIUM < 4.2]Adding doxazosin: Less effective than spironolactone for resistant hypertension according to the PATHWAY-2 trial[/POTASSIUM < 4.2]
* Adding bisoprolol: Beta-blockers are not recommended as fourth-line therapy for hypertension in current guidelines
* Increasing dose of [CURRENT_CCB]: Patient is already on maximum dose; adding a fourth agent is more effective
* Switching ACE/ARB: Lateral switch within same class unlikely to provide significant additional benefit

### Monitoring Requirements
* Blood pressure check in 4 weeks
* Electrolytes and renal function in 2 weeks (especially important with spironolactone)
* Review for side effects (dizziness with doxazosin; gynecomastia or hyperkalemia with spironolactone)

### Key Takeaway
In resistant hypertension, fourth-line therapy choice depends on potassium levels: spironolactone is first choice if potassium allows (<4.5 mmol/L), while doxazosin is preferred when potassium is elevated.`,
  
  timeLimit: 60,
  
  aiEnhancement: {
    enabled: false,
    stemPrompt: "Rewrite this UKMLA clinical scenario to be more realistic and engaging while maintaining all the clinical details: [STEM]",
    explanationPrompt: "Enhance this explanation to be more educational with clear headings, bullet points, and clinical pearls: [EXPLANATION]"
  }
};
