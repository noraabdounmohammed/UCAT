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

  let activeButton: HTMLButtonElement | null = null;
  let activePointerId: number | null = null;
  let startedAt = 0;
  let startX = 0;
  let startY = 0;
  let cancelled = false;

  const resetGesture = () => {
    activeButton = null;
    activePointerId = null;
    startedAt = 0;
    startX = 0;
    startY = 0;
    cancelled = false;
  };

  const onPointerDown = (event: PointerEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button || event.button > 0 || !event.isPrimary) return;

    resetGesture();
    activeButton = button;
    activePointerId = event.pointerId;
    startedAt = performance.now();
    startX = event.clientX;
    startY = event.clientY;
    button.dataset.studyeditOption = 'true';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!activeButton || activePointerId !== event.pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) cancelled = true;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!activeButton || activePointerId !== event.pointerId) return;

    const button = activeButton;
    const heldForMs = performance.now() - startedAt;
    const shouldEliminate = !cancelled && heldForMs >= LONG_PRESS_MS && !button.disabled;

    if (shouldEliminate) {
      const eliminated = button.dataset.studyeditEliminated === 'true';
      if (eliminated) delete button.dataset.studyeditEliminated;
      else button.dataset.studyeditEliminated = 'true';

      // Suppress the synthetic click that browsers emit after pointerup so a long-hold
      // never also selects the answer.
      button.dataset.studyeditSuppressClick = 'true';
      try { navigator.vibrate?.(18); } catch { /* optional haptic */ }
    }

    resetGesture();
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    resetGesture();
  };

  const onClickCapture = (event: MouseEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button) return;

    if (button.dataset.studyeditSuppressClick === 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      delete button.dataset.studyeditSuppressClick;
    }
    // Ordinary short taps are never intercepted and continue to the React answer picker.
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
