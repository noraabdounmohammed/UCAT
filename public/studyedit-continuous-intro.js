(() => {
  const style = document.createElement('style');
  style.textContent = `
    [data-studyedit-session-prelude="true"] {
      margin: 8px 0 44px;
      padding: 10px 0 0;
      color: #2A1E16;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-greeting {
      margin: 0;
      max-width: 620px;
      font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
      font-size: clamp(31px, 6.6vw, 40px);
      font-weight: 400;
      line-height: 1.08;
      letter-spacing: -0.038em;
      color: #1F140C;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
      margin: 17px 0 0;
      max-width: 590px;
      font-size: 17px;
      font-weight: 500;
      line-height: 1.66;
      letter-spacing: -0.008em;
      color: #4A382B;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-handoff {
      margin: 23px 0 0;
      font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
      font-size: 20px;
      font-weight: 400;
      line-height: 1.35;
      letter-spacing: -0.02em;
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
      font-size: clamp(30px, 7vw, 40px) !important;
      line-height: 1.1 !important;
      letter-spacing: -0.035em !important;
    }

    main[data-studyedit-tutor-loading="true"] [data-studyedit-loading-note="true"] {
      margin-top: 16px !important;
      font-size: 13px !important;
      color: #8A7560 !important;
    }

    @media (max-width: 600px) {
      [data-studyedit-session-prelude="true"] {
        margin-bottom: 36px;
        padding-top: 6px;
      }

      [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
        font-size: 16px;
        line-height: 1.62;
      }

      [data-studyedit-session-prelude="true"] .studyedit-prelude-handoff {
        margin-top: 21px;
        font-size: 19px;
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
    let body = "I want to see how you think before I decide what you need from me. We'll start with one case. If you're guessing, tell me. If I’m not making sense, stop me.";

    if (journey === 'new' && personalGreeting) {
      body = "Before I decide what will actually help, I want to see how you approach one case. If you're guessing, tell me. If something feels obvious, say so. You can stop me whenever you want.";
    }

    if (journey === 'returning' && personalGreeting) {
      body = "I’ve got a place I want to start. Let’s do one together and I’ll adjust as we go. If something feels obvious, say so. If I’m missing what you mean, stop me.";
    }

    return {
      id: ++introSequence,
      greeting,
      body,
      handoff: "Alright — here’s the first one.",
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

    // The introduction is part of the tutorial, not an onboarding screen.
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
        moment.textContent = 'I’m thinking about where to start.';
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
