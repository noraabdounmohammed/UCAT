(() => {
  const cleanMarkdownArtifacts = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent) return;
      if (parent.closest('input, textarea, button')) return;
      if (parent.closest('.border-y.py-5')) return; // Preserve learner-authored punctuation.
      if (!node.nodeValue || !node.nodeValue.includes('**')) return;
      node.nodeValue = node.nodeValue.replace(/\*\*/g, '');
    });
  };

  const polish = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach(cleanMarkdownArtifacts);
  };

  let queued = false;
  const queuePolish = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      polish();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish, { once: true });
  } else {
    polish();
  }

  new MutationObserver(queuePolish).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
