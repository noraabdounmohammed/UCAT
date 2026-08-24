const LONG_PRESS_MS = 480;

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
  let longPressTriggered = false;

  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  const finishGesture = () => {
    clearTimer();
    activeButton = null;
  };

  const onPointerDown = (event: PointerEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button || event.button > 0) return;

    clearTimer();
    activeButton = button;
    longPressTriggered = false;
    button.dataset.studyeditOption = 'true';

    timer = window.setTimeout(() => {
      if (!activeButton || activeButton !== button || button.disabled) return;
      const eliminated = button.dataset.studyeditEliminated === 'true';
      if (eliminated) delete button.dataset.studyeditEliminated;
      else button.dataset.studyeditEliminated = 'true';
      longPressTriggered = true;
      button.dataset.studyeditSuppressClick = 'true';
      try { navigator.vibrate?.(12); } catch { /* optional haptic */ }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!activeButton) return;
    const rect = activeButton.getBoundingClientRect();
    const margin = 14;
    if (event.clientX < rect.left - margin || event.clientX > rect.right + margin || event.clientY < rect.top - margin || event.clientY > rect.bottom + margin) {
      finishGesture();
    }
  };

  const onClickCapture = (event: MouseEvent) => {
    const button = isAnswerOptionButton(event.target);
    if (!button) return;
    if (button.dataset.studyeditSuppressClick === 'true' || longPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
      delete button.dataset.studyeditSuppressClick;
      longPressTriggered = false;
    }
  };

  const onContextMenu = (event: MouseEvent) => {
    if (isAnswerOptionButton(event.target)) event.preventDefault();
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', finishGesture, true);
  document.addEventListener('pointercancel', finishGesture, true);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('contextmenu', onContextMenu, true);

  return () => {
    clearTimer();
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', finishGesture, true);
    document.removeEventListener('pointercancel', finishGesture, true);
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
  };
}
