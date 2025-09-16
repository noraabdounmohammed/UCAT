import { UkmlaQuestion } from "../types/dynamicQuestions";
import { generateRandomQuestion } from "../utils/generateRandomQuestion";
import { hypertensionTemplate } from "../data/templates/hypertensionTemplate";

// Registry of available templates
const templateRegistry = {
  "HTN-001": hypertensionTemplate,
  // Add more templates here as they are created
};

/**
 * Fetches a dynamically generated question based on the template ID
 * If no template ID is provided, a random template is selected
 */
export async function fetchDynamicQuestion(templateId?: string): Promise<UkmlaQuestion> {
  // Simulate network delay for realistic API behavior
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let template;
  
  if (templateId && templateRegistry[templateId]) {
    // Use the specified template
    template = templateRegistry[templateId];
  } else {
    // Select a random template if none specified
    const templateIds = Object.keys(templateRegistry);
    const randomTemplateId = templateIds[Math.floor(Math.random() * templateIds.length)];
    template = templateRegistry[randomTemplateId];
  }
  
  // Generate a random question from the template
  return generateRandomQuestion(template);
}

/**
 * Fetches multiple dynamically generated questions
 */
export async function fetchMultipleDynamicQuestions(
  count: number = 5,
  templateIds?: string[]
): Promise<UkmlaQuestion[]> {
  const questions: UkmlaQuestion[] = [];
  
  // If specific template IDs are provided, use them
  if (templateIds && templateIds.length > 0) {
    for (let i = 0; i < count; i++) {
      const templateId = templateIds[i % templateIds.length];
      const question = await fetchDynamicQuestion(templateId);
      questions.push(question);
    }
  } else {
    // Otherwise generate random questions
    for (let i = 0; i < count; i++) {
      const question = await fetchDynamicQuestion();
      questions.push(question);
    }
  }
  
  return questions;
}
