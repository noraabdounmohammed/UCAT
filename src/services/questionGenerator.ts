import { ConceptNode } from '@/types/conceptTypes';

interface GeneratedQuestion {
  id: string;
  concept_id: string;
  question_stem: string;
  clinical_vignette?: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correct_answer: string;
  explanation: string;
  format: 'ukmla_sba' | 'flashcard';
}

// Template for generating UKMLA-style clinical vignettes
const generateClinicalVignette = (concept: ConceptNode): string => {
  const presentations = concept.dimensions?.exam_specific?.ukmla?.presentations || [];
  const systems = concept.dimensions?.exam_specific?.ukmla?.systems || [];
  
  // Create a realistic patient scenario
  const age = Math.floor(Math.random() * 40) + 35; // Random age 35-75
  const gender = Math.random() > 0.5 ? 'man' : 'woman';
  
  // Build the vignette based on available data
  let vignette = `A ${age}-year-old ${gender} presents to the emergency department`;
  
  if (presentations.length > 0) {
    // Use actual presentations from the concept
    const mainPresentation = presentations[0];
    const additionalPresentations = presentations.slice(1, 3).join(', ');
    
    vignette += ` with ${mainPresentation.toLowerCase()}`;
    if (additionalPresentations) {
      vignette += `. The patient also reports ${additionalPresentations.toLowerCase()}`;
    }
  }
  
  // Add relevant system context
  if (systems.includes('Cardiovascular')) {
    vignette += `. Past medical history includes hypertension and type 2 diabetes`;
  } else if (systems.includes('Respiratory')) {
    vignette += `. The patient has a 20 pack-year smoking history`;
  }
  
  vignette += '.';
  
  return vignette;
};

// Generate plausible distractors based on the concept
const generateDistractors = (concept: ConceptNode, correctAnswer: string): string[] => {
  const distractors: string[] = [];
  const competencies = concept.dimensions?.exam_specific?.ukmla?.competencies || [];
  
  // Generate distractors based on competency type
  if (competencies.includes('Diagnosis')) {
    // For diagnosis questions, use related but incorrect diagnoses
    const diagnosticOptions = [
      'Arrange urgent CT pulmonary angiography',
      'Perform bedside echocardiography',
      'Request high-sensitivity troponin and wait for results',
      'Administer high-flow oxygen and reassess',
      'Obtain serial ECGs over the next hour',
      'Give sublingual GTN and observe response',
      'Arrange urgent chest X-ray',
      'Check D-dimer levels'
    ];
    
    // Filter out the correct answer and select 3 distractors
    const available = diagnosticOptions.filter(opt => 
      !opt.toLowerCase().includes(correctAnswer.toLowerCase())
    );
    
    // Shuffle and select 3
    for (let i = 0; i < 3 && i < available.length; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const selected = available.splice(randomIndex, 1)[0];
      distractors.push(selected);
    }
  } else if (competencies.includes('Management')) {
    // For management questions, use alternative management options
    const managementOptions = [
      'Start dual antiplatelet therapy immediately',
      'Administer thrombolysis within 30 minutes',
      'Arrange urgent cardiology consultation',
      'Begin high-dose statin therapy',
      'Initiate beta-blocker therapy',
      'Give loading dose of clopidogrel',
      'Start IV heparin infusion',
      'Administer morphine for pain relief'
    ];
    
    const available = managementOptions.filter(opt => 
      !opt.toLowerCase().includes(correctAnswer.toLowerCase())
    );
    
    for (let i = 0; i < 3 && i < available.length; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const selected = available.splice(randomIndex, 1)[0];
      distractors.push(selected);
    }
  }
  
  // If we don't have enough distractors, add generic ones
  while (distractors.length < 3) {
    distractors.push(`Option ${distractors.length + 2}`);
  }
  
  return distractors;
};

// Generate appropriate question stem based on competency
const generateQuestionStem = (concept: ConceptNode): string => {
  const competencies = concept.dimensions?.exam_specific?.ukmla?.competencies || [];
  
  if (competencies.includes('Diagnosis')) {
    const stems = [
      'What is the most likely diagnosis?',
      'Which investigation would be most appropriate to confirm the diagnosis?',
      'What is the most important initial investigation?',
      'Which finding would be most consistent with the diagnosis?'
    ];
    return stems[Math.floor(Math.random() * stems.length)];
  } else if (competencies.includes('Management')) {
    const stems = [
      'What is the most appropriate next step in management?',
      'What is the most appropriate initial treatment?',
      'Which intervention should be prioritized?',
      'What is the best immediate action?'
    ];
    return stems[Math.floor(Math.random() * stems.length)];
  } else {
    return 'What is the most appropriate next step?';
  }
};

// Main function to generate a UKMLA-style question from a concept
export const generateUKMLAQuestion = (concept: ConceptNode): GeneratedQuestion => {
  // Generate clinical vignette
  const vignette = generateClinicalVignette(concept);
  
  // Generate question stem
  const questionStem = generateQuestionStem(concept);
  
  // Create correct answer based on concept knowledge
  let correctAnswerText = '';
  const competencies = concept.dimensions?.exam_specific?.ukmla?.competencies || [];
  
  if (competencies.includes('Diagnosis') && concept.knowledge?.guideline_ref?.key_line) {
    // Extract key action from guideline
    const guideline = concept.knowledge.guideline_ref.key_line;
    // Parse out the main action (simplified for this example)
    if (guideline.includes('PCI')) {
      correctAnswerText = 'Arrange immediate percutaneous coronary intervention (PCI)';
    } else if (guideline.includes('angiography')) {
      correctAnswerText = 'Perform urgent coronary angiography';
    } else {
      correctAnswerText = 'Initiate evidence-based treatment according to current guidelines';
    }
  } else {
    // Fallback to a reasonable correct answer
    correctAnswerText = 'Initiate appropriate evidence-based management';
  }
  
  // Generate distractors
  const distractors = generateDistractors(concept, correctAnswerText);
  
  // Combine all options and shuffle
  const allOptions = [correctAnswerText, ...distractors];
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
  
  // Find the correct answer index
  const correctIndex = shuffledOptions.indexOf(correctAnswerText);
  const correctId = String.fromCharCode(65 + correctIndex); // A, B, C, D
  
  // Format options
  const formattedOptions = shuffledOptions.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text
  }));
  
  // Generate explanation
  const explanation = concept.knowledge?.decision_rule || 
    `This question tests understanding of ${concept.title}. ${concept.description}`;
  
  return {
    id: `gen-${concept.concept_id}-${Date.now()}`,
    concept_id: concept.concept_id,
    question_stem: questionStem,
    clinical_vignette: vignette,
    options: formattedOptions,
    correct_answer: correctId,
    explanation,
    format: 'ukmla_sba'
  };
};

// Generate a flashcard from a concept
export const generateFlashcard = (concept: ConceptNode): GeneratedQuestion => {
  // For flashcards, use the concept's key information
  const front = `${concept.title}: ${concept.description}`;
  const back = concept.knowledge?.decision_rule || 
    `Key points about ${concept.title}`;
  
  return {
    id: `flash-${concept.concept_id}-${Date.now()}`,
    concept_id: concept.concept_id,
    question_stem: front,
    options: [],
    correct_answer: '',
    explanation: back,
    format: 'flashcard'
  };
};

// Main export function that generates questions based on format
export const generateQuestionFromConcept = (
  concept: ConceptNode, 
  format: 'ukmla_sba' | 'flashcard' = 'ukmla_sba'
): GeneratedQuestion => {
  if (format === 'flashcard') {
    return generateFlashcard(concept);
  }
  return generateUKMLAQuestion(concept);
};
