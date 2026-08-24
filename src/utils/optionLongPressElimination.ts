const LONG_PRESS_MS = 700;
const MOVE_TOLERANCE_PX = 10;

function isAnswerOptionButton(target: EventTarget | null): HTMLButtonElement | null {
  const element = target instanceof Element ? target : null;
  const button = element?.closest('button');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return null;

  const questionSection = button.closest('section[aria-label="Question"]');
  if (!questionSection) return null;

  const firstBadge = button.querySelector('span');
  const letter = firstBadge?.textContent?.trim() || '';
  if (!/^[A-E]$/.test(letter)) return null;
  return button;
}

export function installOptionLongPressElimination() {
  if (typeof document === 'undefined') return () => undefined;

  let timer: number | null = null;
  let activeButton: HTMLButtonElement | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let longPressTriggered = false;

  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  const resetGesture = () => {
    clearTimer();
    activeButton = null;
    activePointerId = null;
    startX = 0;
    startY = 0;
  };

  const onPointerDown = (event: PointerEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button || event.button > 0 || !event.isPrimary) return;

    resetGesture();
    longPressTriggered = false;
    activeButton = button;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    button.dataset.studyeditOption = 'true';

    timer = window.setTimeout(() => {
      if (!activeButton || activeButton !== button || button.disabled || activePointerId !== event.pointerId) return;

      const eliminated = button.dataset.studyeditEliminated === 'true';
      if (eliminated) delete button.dataset.studyeditEliminated;
      else button.dataset.studyeditEliminated = 'true';

      longPressTriggered = true;
      button.dataset.studyeditSuppressClick = 'true';
      try { navigator.vibrate?.(18); } catch { /* optional haptic */ }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!activeButton || activePointerId !== event.pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) resetGesture();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    // A short press must never toggle elimination. Clearing the timer here guarantees
    // ordinary taps are left entirely to the React answer-selection handler.
    resetGesture();
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    resetGesture();
  };

  const onClickCapture = (event: MouseEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button) return;

    // Browsers commonly emit a click after a completed long press. Suppress exactly
    // that one click so eliminating an option never also selects it.
    if (button.dataset.studyeditSuppressClick === 'true' || longPressTriggered) {
      event.preventDefault();
      event.stopImmediatePropagation();
      delete button.dataset.studyeditSuppressClick;
      longPressTriggered = false;
      return;
    }

    // Ordinary clicks/taps are intentionally untouched.
    longPressTriggered = false;
  };

  const onContextMenu = (event: MouseEvent) => {
    if (isAnswerOptionButton(event.target)) event.preventDefault();
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerCancel, true);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('contextmenu', onContextMenu, true);

  return () => {
    resetGesture();
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerCancel, true);
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
  };
}
