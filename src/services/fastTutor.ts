// Compatibility entry point for older imports. All tutor requests now use the
// same server-side proxy, so no provider credential can enter a browser bundle.
export {
  generateAIResponse,
  generateAIResponseStream,
  generateFallbackResponse,
  getLearnerContextSnapshot,
} from './openai';

export type { QuestionContext } from './openai';
