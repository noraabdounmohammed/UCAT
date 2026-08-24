function selectionIsInsidePracticeQuestion() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const node = selection.anchorNode || selection.focusNode;
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest('section[aria-label="Question"]'));
}

/**
 * Android selection is fragile when the practice explainer reacts to
 * selectionchange/pointerup by updating React state. On coarse-pointer devices,
 * keep those gesture events entirely native inside the question text so the
 * browser owns selection handles/highlight without interruption.
 *
 * This intentionally favours reliable text selection over the contextual
 * Explain affordance on touch devices. Desktop behaviour is unchanged.
 */
export function installNativeMobileSelectionGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  if (!window.matchMedia?.('(pointer: coarse)').matches) return () => undefined;

  const stopStudyEditSelectionReaction = (event: Event) => {
    const target = event.target as Node | null;
    const targetElement = target instanceof Element ? target : target?.parentElement;
    const insideQuestion = Boolean(targetElement?.closest?.('section[aria-label="Question"]')) || selectionIsInsidePracticeQuestion();
    if (!insideQuestion) return;
    // Do not preventDefault: the browser must keep complete control of native selection.
    event.stopImmediatePropagation();
  };

  const selectionHandler = (event: Event) => stopStudyEditSelectionReaction(event);
  const pointerHandler = (event: Event) => stopStudyEditSelectionReaction(event);

  document.addEventListener('selectionchange', selectionHandler, true);
  document.addEventListener('pointerup', pointerHandler, true);
  document.addEventListener('touchend', pointerHandler, true);
  document.addEventListener('mouseup', pointerHandler, true);
  document.addEventListener('contextmenu', pointerHandler, true);

  return () => {
    document.removeEventListener('selectionchange', selectionHandler, true);
    document.removeEventListener('pointerup', pointerHandler, true);
    document.removeEventListener('touchend', pointerHandler, true);
    document.removeEventListener('mouseup', pointerHandler, true);
    document.removeEventListener('contextmenu', pointerHandler, true);
  };
}
