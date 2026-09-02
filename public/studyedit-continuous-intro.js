(() => {
  const style = document.createElement('style');
  style.textContent = `
    [data-studyedit-session-prelude="true"] {
      margin: 2px 0 28px;
      padding: 2px 0 0;
      color: #2A1E16;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-greeting {
      margin: 0;
      max-width: 600px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 25px;
      font-weight: 650;
      line-height: 1.25;
      letter-spacing: -0.025em;
      color: #1F140C;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
      margin: 12px 0 0;
      max-width: 580px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 16px;
      font-weight: 450;
      line-height: 1.6;
      letter-spacing: 0;
      color: #4A382B;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-handoff {
      margin: 16px 0 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 16px;
      font-weight: 650;
      line-height: 1.5;
      letter-spacing: -0.01em;
      color: #1F140C;
    }

    main[data-studyedit-tutor-loading="true"] {
      min-height: 100dvh !important;
      background: #F4ECDF !important;
    }

    main[data-studyedit-tutor-loading="true"] > div {
      min-height: 100dvh !important;
      justify-content: flex-start !important;
      padding-top: min(30vh, 230px) !important;
    }

    main[data-studyedit-tutor-loading="true"] h1 {
      max-width: 500px !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 24px !important;
      font-weight: 650 !important;
      line-height: 1.3 !important;
      letter-spacing: -0.02em !important;
    }

    main[data-studyedit-tutor-loading="true"] [data-studyedit-loading-note="true"] {
      margin-top: 12px !important;
      font-size: 13px !important;
      color: #8A7560 !important;
    }

    @media (max-width: 600px) {
      [data-studyedit-session-prelude="true"] {
        margin-bottom: 24px;
      }

      [data-studyedit-session-prelude="true"] .studyedit-prelude-greeting {
        font-size: 24px;
      }

      [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
        font-size: 16px;
        line-height: 1.58;
      }
    }
  `;
  document.head.appendChild(style);

  let pendingPrelude = null;
  let introSequence = 0;
  const JOURNEY_KEY = 'studyedit_current_journey_v1';

  const text = (node) => (node?.textContent || '').trim();

  const rememberJourneyFromHome = () => {
    const bodyText = text(document.body);
    if (/study medicine with someone paying attention/i.test(bodyText)) {
      sessionStorage.setItem(JOURNEY_KEY, 'cold');
      return;
    }
    if (/let[’']s find your starting point/i.test(bodyText)) {
      sessionStorage.setItem(JOURNEY_KEY, 'new');
      return;
    }
    if (/i[’']d start with what has been giving you trouble|i[’']d start with what is due|ready\? i[’']ll choose the next useful five/i.test(bodyText)) {
      sessionStorage.setItem(JOURNEY_KEY, 'returning');
    }
  };

  const makePrelude = (rawGreeting) => {
    const journey = sessionStorage.getItem(JOURNEY_KEY) || 'cold';
    const personalGreeting = Boolean(rawGreeting && !/you just need to turn up/i.test(rawGreeting));

    let greeting = personalGreeting ? rawGreeting : 'Hi — good to meet you.';
    let body = "I’ll start with one case and get a feel for how you think. If you’re guessing, tell me. If something doesn’t make sense, stop me.";

    if (journey === 'new' && personalGreeting) {
      body = "I’ll start with one case and get a feel for how you think. If you’re guessing, tell me. If something feels obvious, say so.";
    }

    if (journey === 'returning' && personalGreeting) {
      body = "I’ve got a place I want to start. We’ll do one together and I’ll adjust from there.";
    }

    return {
      id: ++introSequence,
      greeting,
      body,
      handoff: "Here’s the first one.",
    };
  };

  const consumeSeparateIntro = () => {
    const introButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /take me through it/i.test(text(button))
    );
    if (!(introButton instanceof HTMLButtonElement) || introButton.dataset.studyeditContinuousIntroHandled === 'true') return;

    const introSurface = introButton.closest('main');
    if (!(introSurface instanceof HTMLElement)) return;

    const heading = introSurface.querySelector('h1');
    pendingPrelude = makePrelude(text(heading));
    introButton.dataset.studyeditContinuousIntroHandled = 'true';

    introSurface.style.opacity = '0';
    introSurface.style.pointerEvents = 'none';
    requestAnimationFrame(() => introButton.click());
  };

  const injectPreludeIntoLesson = () => {
    if (!pendingPrelude) return;

    const question = document.querySelector('section[aria-label="Question"]');
    if (!(question instanceof HTMLElement)) return;
    const main = question.closest('main');
    if (!(main instanceof HTMLElement)) return;
    if (main.querySelector('[data-studyedit-session-prelude="true"]')) {
      pendingPrelude = null;
      return;
    }

    const prelude = document.createElement('section');
    prelude.setAttribute('data-studyedit-session-prelude', 'true');
    prelude.dataset.studyeditPreludeId = String(pendingPrelude.id);

    const greeting = document.createElement('h1');
    greeting.className = 'studyedit-prelude-greeting';
    greeting.textContent = pendingPrelude.greeting;

    const body = document.createElement('p');
    body.className = 'studyedit-prelude-body';
    body.textContent = pendingPrelude.body;

    const handoff = document.createElement('p');
    handoff.className = 'studyedit-prelude-handoff';
    handoff.textContent = pendingPrelude.handoff;

    prelude.append(greeting, body, handoff);
    main.insertBefore(prelude, question);
    pendingPrelude = null;
  };

  const softenLoadingVoice = () => {
    document.querySelectorAll('main h1').forEach((heading) => {
      if (!(heading instanceof HTMLElement)) return;
      const value = text(heading);
      if (value === 'I’m choosing a good place to start.') heading.textContent = 'Give me a second.';
      if (value === 'I’m choosing the next useful question.') heading.textContent = 'One second.';
    });

    document.querySelectorAll('main').forEach((main) => {
      if (!(main instanceof HTMLElement)) return;
      const heading = main.querySelector('h1');
      if (!heading || !/give me a second|one second/i.test(text(heading))) return;
      main.setAttribute('data-studyedit-tutor-loading', 'true');
      const label = Array.from(main.querySelectorAll('div')).find((node) => text(node) === 'StudyEdit');
      if (label instanceof HTMLElement) label.style.display = 'none';
      const moment = Array.from(main.querySelectorAll('span')).find((node) => text(node) === 'One moment');
      if (moment instanceof HTMLElement) {
        moment.textContent = 'I’m choosing where to start.';
        moment.parentElement?.setAttribute('data-studyedit-loading-note', 'true');
      }
    });
  };

  const run = () => {
    rememberJourneyFromHome();
    softenLoadingVoice();
    consumeSeparateIntro();
    injectPreludeIntoLesson();
  };

  let queued = false;
  const queueRun = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  new MutationObserver(queueRun).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
