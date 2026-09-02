(() => {
  const style = document.createElement('style');
  style.textContent = `
    [data-studyedit-session-prelude="true"] {
      margin: 4px 0 38px;
      padding: 6px 0 30px;
      border-bottom: 1px solid rgba(196, 177, 153, 0.48);
      color: #2A1E16;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-greeting {
      margin: 0;
      max-width: 620px;
      font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
      font-size: clamp(31px, 7vw, 42px);
      font-weight: 400;
      line-height: 1.08;
      letter-spacing: -0.04em;
      color: #1F140C;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
      margin: 18px 0 0;
      max-width: 610px;
      font-size: 18px;
      font-weight: 500;
      line-height: 1.62;
      letter-spacing: -0.01em;
      color: #3B2A1E;
    }

    [data-studyedit-session-prelude="true"] .studyedit-prelude-handoff {
      margin: 15px 0 0;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.5;
      color: #8A7560;
    }

    @media (max-width: 600px) {
      [data-studyedit-session-prelude="true"] {
        margin-bottom: 30px;
        padding-bottom: 25px;
      }

      [data-studyedit-session-prelude="true"] .studyedit-prelude-body {
        font-size: 17px;
        line-height: 1.58;
      }
    }
  `;
  document.head.appendChild(style);

  let pendingPrelude = null;
  let introSequence = 0;

  const text = (node) => (node?.textContent || '').trim();

  const makePrelude = (rawGreeting) => {
    const hasPersonalGreeting = Boolean(rawGreeting && !/you just need to turn up/i.test(rawGreeting));
    const greeting = hasPersonalGreeting ? rawGreeting : 'Hi — good to meet you.';
    const body = hasPersonalGreeting
      ? "I've got a sense of where I want to start. Let's do one together and I'll adjust as we go. If you're guessing, tell me. If something feels obvious, say so. And if I'm not making sense, stop me."
      : "I want to get a feel for how you think before I decide what you need from me. Let's start with one case. If you're guessing, tell me. If you want to ask why or stop me halfway through, just do.";

    return {
      id: ++introSequence,
      greeting,
      body,
      handoff: "Okay — here's the first one.",
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

    // The intro belongs to the lesson itself, so don't make the learner click through a separate app-like screen.
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
      if (value === 'I’m choosing a good place to start.') heading.textContent = 'Alright — give me a second.';
      if (value === 'I’m choosing the next useful question.') heading.textContent = 'One sec — I know what I want to give you next.';
    });

    document.querySelectorAll('main').forEach((main) => {
      if (!(main instanceof HTMLElement)) return;
      const heading = main.querySelector('h1');
      if (!heading || !/alright — give me a second|one sec — i know what i want/i.test(text(heading))) return;
      const label = Array.from(main.querySelectorAll('div')).find((node) => text(node) === 'StudyEdit');
      if (label instanceof HTMLElement) label.style.display = 'none';
      const moment = Array.from(main.querySelectorAll('span')).find((node) => text(node) === 'One moment');
      if (moment instanceof HTMLElement) moment.textContent = 'I’m choosing where to start';
    });
  };

  const run = () => {
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
