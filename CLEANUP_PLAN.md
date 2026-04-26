# 🧹 Codebase Cleanup Plan

## Files to Remove (Safe to Delete)

### 1. Duplicate/Backup Files
- `src/store/conceptStore.fixed.ts`
- `src/store/conceptStore.fixed2.ts` 
- `src/store/conceptStore.old.ts`
- `src/store/conceptStore.ts.fixed`
- `src/components/concept/ConceptGridView.fixed.tsx`
- `src/components/concept/ConceptBulkUploadPage.fixed.tsx`
- `src/components/practice/ApplePracticeSession.fixed.tsx`
- `src/components/practice/PracticeSection.fixed2.tsx`
- `src/data/questionDatabase.fixed.json`
- `src/pages/QuestionPracticePage.tsx.fixed`

### 2. Unused Delete Button Components
- `src/components/concept/DeleteButton.tsx`
- `src/components/concept/SimpleDeleteButton.tsx` 
- `src/components/concept/WorkingDeleteButton.tsx`

### 3. Example/Demo Components (Development Only)
- `src/components/examples/ChatInputExample.tsx`
- `src/components/examples/ConciseExplanationDemo.tsx`
- `src/components/examples/DynamicQuestionDemo.tsx`
- `src/components/examples/TestExplanationGenerator.tsx`

### 4. Alternative/Unused Graph Views
- `src/components/concept/ConceptGraphView.new.tsx`
- `src/components/practice/ConceptNodeGraphView.tsx`
- `src/components/practice/ConceptNodeTreeView.tsx`

### 5. Unused Practice Components
- `src/components/practice/ApplePracticeSession.new.tsx`
- `src/components/practice/ConceptNodePracticeSection.tsx`
- `src/components/practice/AbsoluteScrollLock.tsx`
- `src/components/practice/AllTopicsButton.tsx`
- `src/components/practice/AllTopicsToggle.tsx`

## Code Simplifications Completed

### ✅ Removed Unused Imports
- Removed `Trash2` from ConceptEditorModal
- Removed `onDelete` parameter from ConceptEditorModal
- Removed `generateQuestionFromConcept` from conceptStore (using config version)

### ✅ Cleaned Up Debug Logs
- Organized console logs with `NODE_ENV` checks
- Consolidated multiple log statements into single objects
- Removed verbose debugging from production code

### ✅ Simplified Function Signatures
- Using config-based approach for question generation
- Removed unused optional parameters
- Cleaner TypeScript interfaces

## Remaining Cleanup Tasks

### 1. Remove Unused TypeScript Interfaces
- Check for unused interfaces in `conceptTypes.ts`
- Remove legacy interfaces from old implementations

### 2. Consolidate Similar Components
- Review multiple practice session components
- Merge similar functionality where possible

### 3. Clean Up CSS/Styling
- Remove unused CSS classes
- Consolidate duplicate styles

### 4. Optimize Imports
- Use barrel exports for cleaner imports
- Remove circular dependencies

## Benefits After Cleanup

- **Reduced Bundle Size**: Fewer unused files and imports
- **Better Performance**: Less code to parse and execute
- **Improved Maintainability**: Cleaner codebase structure
- **Easier Navigation**: Fewer duplicate/confusing files
- **Better Developer Experience**: Clear, focused codebase

## Safety Notes

- All files marked for deletion are not imported anywhere
- Backup files (.fixed, .old) are development artifacts
- Example components are for demonstration only
- Multiple delete button components serve same purpose
