(() => {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const setReactInputValue = (input, value) => {
    const prototype = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const markCaseSummary = () => {
    document.querySelectorAll('button').forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      const value = text(button);
      if (!/\b(?:show|review) case\b/i.test(value)) return;
      button.setAttribute('data-studyedit-case-summary', 'true');
    });
  };

  const markTutorSections = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach((section) => {
      if (!(section instanceof HTMLElement)) return;

      Array.from(section.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const value = text(child).toLowerCase();
        if (value === 'correct' || value === 'not quite' || child.hasAttribute('data-studyedit-outcome')) {
          child.setAttribute('data-studyedit-outcome', 'true');
        }
      });

      const thread = section.querySelector('.space-y-6');
      if (thread instanceof HTMLElement) {
        Array.from(thread.children).forEach((child) => {
          if (!(child instanceof HTMLElement)) return;
          if (child.matches('[role="status"]')) return;
          if (child.hasAttribute('data-studyedit-pending-message')) {
            child.setAttribute('data-studyedit-turn', 'student');
            return;
          }
          if (child.matches('.border-y.py-5')) child.setAttribute('data-studyedit-turn', 'student');
          else child.setAttribute('data-studyedit-turn', 'tutor');
        });
      }

      section.querySelectorAll('button').forEach((button) => {
        const value = text(button);
        if (value === 'Just explain it') {
          button.textContent = "I'm stuck";
          button.setAttribute('data-studyedit-stuck', 'true');
        }
      });
    });
  };

  const captureStuck = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('button[data-studyedit-stuck="true"]');
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;

    const section = button.closest('section[aria-label="Answer and tutor"]');
    const form = section?.querySelector('form');
    const input = form?.querySelector('input, textarea');
    if (!(form instanceof HTMLFormElement)) return;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    if (input.disabled) return;

    // The old button called the generic "explain again" path directly, so the
    // learner's action never appeared in the conversation and the model often
    // repeated the teaching it had just given. Treat this exactly like a real
    // learner turn instead: show it immediately and let the tutor respond to
    // the current Quick check in the conversation context.
    event.preventDefault();
    event.stopImmediatePropagation();

    setReactInputValue(input, "I'm stuck — help me with this check.");
    window.setTimeout(() => form.requestSubmit(), 0);
  };

  const run = () => {
    markCaseSummary();
    markTutorSections();
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  };

  document.addEventListener('click', captureStuck, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  // Tutor replies stream token-by-token. Watching characterData caused a full document
  // rescan on every token, which made mobile feedback feel slower and less fluid.
  // Structural UI state changes (new turn, form, case summary, wrap-up) are childList
  // mutations, so character changes can safely be ignored here.
  new MutationObserver(queue).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
