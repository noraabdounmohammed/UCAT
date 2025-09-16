import { UkmlaQuestion } from "../types/dynamicQuestions";

/**
 * Interface for conditional sections in explanation templates
 */
interface ConditionalSection {
  condition: string;
  content: string;
  fullMatch: string;
}

/**
 * Parses conditional sections from an explanation template
 * Looks for patterns like [CONDITION]Content[/CONDITION]
 */
function parseConditionalSections(template: string): {
  conditionalSections: ConditionalSection[];
  baseTemplate: string;
} {
  const conditionalSections: ConditionalSection[] = [];
  let baseTemplate = template;
  
  // Regular expression to match conditional sections
  // Format: [VARIABLE OPERATOR VALUE]Content[/VARIABLE OPERATOR VALUE]
  const regex = /\[(\w+)\s*([<>=!]+)\s*([\w.]+)\](.*?)\[\/([\w]+)\s*([<>=!]+)\s*([\w.]+)\]/gs;
  
  // Extract all conditional sections
  let match;
  while ((match = regex.exec(template)) !== null) {
    const [fullMatch, variable, operator, value, content] = match;
    
    conditionalSections.push({
      condition: `${variable} ${operator} ${value}`,
      content,
      fullMatch
    });
  }
  
  return { conditionalSections, baseTemplate };
}

/**
 * Evaluates a condition string against a set of variables
 * Supports basic comparison operators: <, >, <=, >=, ==, !=
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
  // Parse the condition into variable, operator, and value
  const regex = /([\w]+)\s*([<>=!]+)\s*([\w.]+)/;
  const match = condition.match(regex);
  
  if (!match) return false;
  
  const [, variable, operator, valueStr] = match;
  
  // Get the variable value
  const variableValue = variables[variable];
  if (variableValue === undefined) return false;
  
  // Convert value to number if possible
  const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
  const varValue = isNaN(Number(variableValue)) ? variableValue : Number(variableValue);
  
  // Evaluate the condition
  switch (operator) {
    case '<': return varValue < value;
    case '<=': return varValue <= value;
    case '>': return varValue > value;
    case '>=': return varValue >= value;
    case '==': return varValue == value;
    case '!=': return varValue != value;
    default: return false;
  }
}

/**
 * Generates a clean explanation by evaluating conditional sections
 * and replacing variables in the template
 */
export function generateExplanation(
  template: string,
  variables: Record<string, any>,
  structureTemplate?: {
    introduction?: string;
    guidelineRecommendation?: string;
    incorrectOptions?: string[];
    monitoring?: string;
    keyTakeaway?: string;
  }
): string {
  // Parse conditional sections
  const { conditionalSections } = parseConditionalSections(template);
  
  // Start with the full template
  let explanation = template;
  
  // Process each conditional section
  for (const section of conditionalSections) {
    const isConditionMet = evaluateCondition(section.condition, variables);
    
    if (isConditionMet) {
      // Keep the content but remove the condition tags
      explanation = explanation.replace(section.fullMatch, section.content);
    } else {
      // Remove the entire conditional section if condition is not met
      explanation = explanation.replace(section.fullMatch, '');
    }
  }
  
  // Replace all variables in the explanation
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    explanation = explanation.replace(regex, String(value));
  });
  
  // If a structure template is provided, format the explanation accordingly
  if (structureTemplate) {
    let structuredExplanation = '';
    
    // Introduction
    if (structureTemplate.introduction) {
      structuredExplanation += `## ${structureTemplate.introduction}\n\n`;
    }
    
    // Main explanation content
    structuredExplanation += explanation + '\n\n';
    
    // Guideline recommendation
    if (structureTemplate.guidelineRecommendation) {
      structuredExplanation += `### Guideline Recommendation\n${structureTemplate.guidelineRecommendation}\n\n`;
    }
    
    // Incorrect options
    if (structureTemplate.incorrectOptions && structureTemplate.incorrectOptions.length > 0) {
      structuredExplanation += '### Why Other Options Are Incorrect\n';
      structureTemplate.incorrectOptions.forEach(option => {
        structuredExplanation += `- ${option}\n`;
      });
      structuredExplanation += '\n';
    }
    
    // Monitoring
    if (structureTemplate.monitoring) {
      structuredExplanation += `### Monitoring and Review\n${structureTemplate.monitoring}\n\n`;
    }
    
    // Key takeaway
    if (structureTemplate.keyTakeaway) {
      structuredExplanation += `**Key Takeaway**: ${structureTemplate.keyTakeaway}`;
    }
    
    return structuredExplanation;
  }
  
  return explanation;
}

/**
 * Generates an explanation for a question based on its template and variables
 */
export function generateQuestionExplanation(
  question: UkmlaQuestion,
  variables: Record<string, any>,
  explanationTemplate: string
): string {
  // Extract specific variables needed for structuring the explanation
  const {
    topic,
    microSkill,
    difficulty,
    options,
    correctAnswer
  } = question;
  
  // Create a structure template based on the question type
  const structureTemplate = {
    introduction: `${topic} - ${microSkill}`,
    guidelineRecommendation: variables.GUIDELINE_RECOMMENDATION || '',
    incorrectOptions: options
      .filter((_, index) => index !== correctAnswer)
      .map((option, index) => {
        // Try to get specific explanations for incorrect options
        const incorrectKey = `INCORRECT_${index + 1}`;
        return variables[incorrectKey] || `${option}: Not the optimal choice based on the clinical scenario.`;
      }),
    monitoring: variables.MONITORING || 'Regular follow-up and monitoring of treatment response is essential.',
    keyTakeaway: variables.KEY_TAKEAWAY || `In ${topic.toLowerCase()} management, evidence-based decision making is crucial for optimal patient outcomes.`
  };
  
  return generateExplanation(explanationTemplate, variables, structureTemplate);
}
