// Marks the part (Teil 1 / Teil 2) currently in view in the sticky section bar.
(function () {
  const links = Array.from(document.querySelectorAll('.subnav a[href^="#"]'));
  const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1)));
  if (!links.length || targets.some(t => !t)) return;
  const bars = Array.from(document.querySelectorAll('.topbar, .subnav'));

  function update() {
    const line = Math.max(0, ...bars.map(b => b.getBoundingClientRect().bottom)) + 40;
    let current = -1;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top <= line) current = i; });
    links.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
