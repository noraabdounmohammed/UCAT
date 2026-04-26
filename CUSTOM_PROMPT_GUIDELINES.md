# Custom Prompt Implementation Guidelines

## 🚨 Preventing Custom Prompt Issues

This document outlines best practices to prevent custom prompts from being ignored in future implementations.

## ⚠️ Common Issue Pattern

**Problem:** Custom prompts configured in UI but not passed to AI generation functions.

**Root Cause:** Function calls missing optional parameters, causing fallback to default prompts.

## ✅ Prevention Strategies

### 1. **Use Type-Safe Configuration Objects**

**❌ Prone to errors:**
```typescript
generateQuestionFromConcept(concept, format, customPrompt, customFlashcardPrompt)
```

**✅ Recommended approach:**
```typescript
generateQuestionWithConfig({
  concept,
  format,
  customPrompt,
  customFlashcardPrompt
})
```

### 2. **Add Parameter Validation**

Always include logging to verify parameters are received:

```typescript
export async function generateQuestionFromConcept(
  concept: ConceptNode,
  format: 'ukmla_sba' | 'flashcard' = 'ukmla_sba',
  customPrompt?: string,
  customFlashcardPrompt?: string
): Promise<GeneratedQuestion> {
  // Validation logging
  console.log('🔧 Question Generation Parameters:');
  console.log('- Format:', format);
  console.log('- Custom UKMLA prompt provided:', !!customPrompt);
  console.log('- Custom Flashcard prompt provided:', !!customFlashcardPrompt);
  
  if (format === 'flashcard' && !customFlashcardPrompt) {
    console.warn('⚠️ No custom flashcard prompt provided - using default');
  }
  
  // ... rest of function
}
```

### 3. **Interface Design**

Create explicit interfaces for configuration:

```typescript
interface QuestionGenerationConfig {
  concept: ConceptNode;
  format: 'ukmla_sba' | 'flashcard';
  customPrompt?: string;
  customFlashcardPrompt?: string;
}
```

### 4. **Testing Checklist**

When adding new custom prompt features:

- [ ] Verify prompt is captured in UI configuration
- [ ] Check prompt is included in config object
- [ ] Ensure config object is passed to generation function
- [ ] Confirm generation function receives all parameters
- [ ] Test with browser console logs enabled
- [ ] Verify AI receives custom prompt (not default)

## 🔍 Debugging Custom Prompts

### Console Log Patterns

Look for these debug messages:

```
🔧 Question Generation Parameters:
- Format: flashcard
- Custom UKMLA prompt provided: false
- Custom Flashcard prompt provided: true

🎯 Flashcard Generation Debug:
Custom flashcard prompt received: [your custom prompt]
Using custom prompt: true
Final instructions being used: [actual prompt sent to AI]
```

### Warning Signs

**🚨 Red flags indicating issues:**
- `Using custom prompt: false` when you expect `true`
- `No custom flashcard prompt provided` warnings
- Generated content doesn't match your custom instructions
- AI responses use default template patterns

## 📋 Implementation Checklist

When adding new custom prompt types:

1. **UI Configuration**
   - [ ] Add input field for custom prompt
   - [ ] Include in configuration state
   - [ ] Save to localStorage if needed

2. **Configuration Interface**
   - [ ] Add field to `PracticeConfig` interface
   - [ ] Update config object creation
   - [ ] Pass config to practice start function

3. **Generation Function**
   - [ ] Add parameter to generation function signature
   - [ ] Add validation logging
   - [ ] Use parameter in AI prompt construction
   - [ ] Add fallback handling

4. **Store Integration**
   - [ ] Pass all config parameters to generation function
   - [ ] Use config-based approach when possible
   - [ ] Add error handling for missing parameters

## 🛡️ Future-Proofing

### Recommended Architecture

```typescript
// 1. Strong typing
interface CustomPromptConfig {
  ukmlaPrompt?: string;
  flashcardPrompt?: string;
  clinicalScenarioPrompt?: string;  // Future addition
  mnemonicPrompt?: string;          // Future addition
}

// 2. Centralized validation
function validatePromptConfig(config: CustomPromptConfig, format: string): void {
  if (format === 'flashcard' && !config.flashcardPrompt) {
    console.warn('⚠️ Flashcard format selected but no flashcard prompt provided');
  }
  // Add more validations as needed
}

// 3. Explicit parameter passing
function generateWithPrompts(concept: ConceptNode, config: CustomPromptConfig) {
  validatePromptConfig(config, format);
  // Explicit parameter usage
}
```

## 📝 Code Review Guidelines

When reviewing custom prompt implementations:

- ✅ Verify all prompt parameters are passed through the call chain
- ✅ Check for validation logging
- ✅ Ensure fallback behavior is documented
- ✅ Test with actual custom prompts
- ✅ Verify console logs show correct parameter values

## 🎯 Key Takeaway

**Always trace the data flow:**
UI Input → Configuration → Store → Generation Function → AI API

Each step must explicitly pass custom prompts to prevent silent fallbacks to defaults.
