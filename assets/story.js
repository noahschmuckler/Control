// Animated presentation runtime.
// - Smooth wheel scrolling (Lenis), smooth anchor jumps, presenter keys.
// - Pinned decks: scroll position picks the active step; cards and stages
//   change with CSS transitions, so a stepwise wheel never drags them.
// - Reveal-on-scroll that replays whenever content re-enters from below.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.topnav');
  const bar = document.querySelector('.progress i');
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const absTop = (el) => el.getBoundingClientRect().top + scrollY;
  let navH = nav.offsetHeight;

  // ── Smooth scrolling ──────────────────────────────────────────────
  const lenis = window.Lenis ? new window.Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9 }) : null;
  let jumping = false;
  let jumpTimer = 0;
  function scrollToY(y, { long = false } = {}) {
    y = Math.max(0, Math.min(y, root.scrollHeight - innerHeight));
    const dist = Math.abs(y - scrollY);
    const duration = Math.min(2.2, 0.75 + dist / 3500);
    // Long jumps skip intermediate deck steps and animate only the arrival.
    if (long && dist > innerHeight * 1.5) {
      jumping = true;
      clearTimeout(jumpTimer);
      jumpTimer = setTimeout(endJump, duration * 1000 + 400);
    }
    if (lenis) lenis.scrollTo(y, { duration, easing: easeInOut, onComplete: endJump });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  function endJump() { if (!jumping) return; jumping = false; clearTimeout(jumpTimer); update(); }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id && id !== 'top' ? document.getElementById(id) : null;
    if (id && id !== 'top' && !el) return;
    e.preventDefault();
    scrollToY(el ? absTop(el) - navH - 8 : 0, { long: true });
    history.replaceState(null, '', id ? `#${id}` : location.pathname);
  });

  // ── Pinned decks ──────────────────────────────────────────────────
  const decks = [...document.querySelectorAll('.scrolly')].map((sc) => ({
    sc,
    n: +sc.dataset.n,
    pin: sc.querySelector('.pin'),
    cards: [...sc.querySelectorAll('.scard')],
    rail: [...sc.querySelectorAll('.rail li')],
    stage: sc.querySelector('.stage'),
    fit: sc.querySelector('.stage-fit'),
    blks: [...sc.querySelectorAll('.blk')],
    from: [...sc.querySelectorAll('.stage [data-from]')],
    at: [...sc.querySelectorAll('.stage [data-at]')],
    cur: -2,
  }));

  function countUp(el) {
    const end = +el.dataset.count;
    const t0 = performance.now();
    const dur = reduce ? 0 : 1100;
    cancelAnimationFrame(el._raf);
    const f = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) el._raf = requestAnimationFrame(f);
    };
    el._raf = requestAnimationFrame(f);
  }
  function counters(el, on) {
    el.querySelectorAll('[data-count]').forEach((c) => {
      if (on) countUp(c); else { cancelAnimationFrame(c._raf); c.textContent = '0'; }
    });
  }

  function highlight(d, hl) {
    let k = 0;
    d.blks.forEach((b) => {
      const lit = hl === 'all' || b.dataset.tags.split(' ').includes(hl);
      b.style.transitionDelay = lit && !b.classList.contains('lit') ? `${k++ * 40}ms` : '0ms';
      b.classList.toggle('lit', lit);
      b.classList.toggle('dim', !lit && hl !== 'none');
    });
  }

  function setStep(d, k) {
    d.cur = k;
    const s = k + 1;
    d.sc.dataset.k = k;
    d.cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === k);
      c.classList.toggle('is-past', i < k);
      c.classList.toggle('is-future', i > k);
      c.setAttribute('aria-hidden', String(i !== k));
    });
    d.rail.forEach((r, i) => { r.classList.toggle('on', i === k); r.classList.toggle('done', i < k); });
    d.stage.dataset.step = s;
    d.from.forEach((el) => {
      const on = s >= +el.dataset.from;
      if (on !== el.classList.contains('on')) { el.classList.toggle('on', on); counters(el, on); }
    });
    d.at.forEach((el) => el.classList.toggle('cur', el.dataset.at.split(' ').includes(String(s))));
    if (d.blks.length) highlight(d, k >= 0 ? d.cards[k].dataset.hl || 'none' : 'none');
  }

  // Fit each stage into its pinned area. CSS zoom (not transform) so content
  // reflows into the width it gains. When the QR code would overlap the stage,
  // the whole pinned area centres above it so card and stage stay aligned.
  const qr = document.getElementById('qr');
  function fitStage(d) {
    const wrap = d.pin.firstElementChild;
    wrap.style.paddingBottom = '';
    d.fit.style.zoom = '';
    if (qr && innerWidth > 860) {
      const q = qr.getBoundingClientRect();
      if (q.left < d.stage.getBoundingClientRect().right - 8) wrap.style.paddingBottom = `${Math.round(innerHeight - q.top + 12)}px`;
    }
    const avail = d.stage.clientHeight - 8;
    if (d.fit.getBoundingClientRect().height <= avail) return;
    let lo = 0.4;
    let hi = 1;
    for (let i = 0; i < 8; i++) {
      const z = (lo + hi) / 2;
      d.fit.style.zoom = z;
      if (d.fit.getBoundingClientRect().height <= avail) lo = z; else hi = z;
    }
    d.fit.style.zoom = lo.toFixed(3);
  }

  function layout() {
    navH = nav.offsetHeight;
    root.style.setProperty('--nav-h', `${navH}px`);
    decks.forEach((d) => {
      d.pinH = d.pin.offsetHeight;
      d.L = Math.round(d.pinH * (innerWidth <= 860 ? 0.72 : 0.62));
      d.sc.style.height = `${d.pinH + d.n * d.L}px`;
      fitStage(d);
    });
  }

  // ── Scroll-driven state ───────────────────────────────────────────
  const links = [...document.querySelectorAll('.navin a[href^="#"]:not(.brand)')];
  const sections = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let activeLink = null;
  function spy() {
    const mid = innerHeight * 0.45;
    let found = null;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < mid) found = links[i]; });
    if (scrollY < innerHeight * 0.5) found = null;
    if (found === activeLink) return;
    if (activeLink) activeLink.classList.remove('active');
    activeLink = found;
    if (found) {
      found.classList.add('active');
      const box = found.parentElement;
      if (found.offsetLeft < box.scrollLeft || found.offsetLeft + found.offsetWidth > box.scrollLeft + box.clientWidth) {
        box.scrollTo({ left: found.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }

  let ticking = false;
  function update() {
    ticking = false;
    bar.style.transform = `scaleX(${scrollY / Math.max(1, root.scrollHeight - innerHeight)})`;
    spy();
    if (jumping) return;
    decks.forEach((d) => {
      const offset = navH - d.sc.getBoundingClientRect().top;
      const k = offset < -d.pinH * 0.18 ? -1 : Math.max(0, Math.min(d.n - 1, Math.floor(Math.max(0, offset) / d.L)));
      if (k !== d.cur) setStep(d, k);
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });

  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); update(); }, 120); });
  document.querySelector('.qr-toggle')?.addEventListener('click', () => setTimeout(() => decks.forEach(fitStage), 320));

  // ── Presenter keys: → / PageDown / Space step forward; ← / PageUp back ──
  function stops() {
    const out = [{ y: 0, head: true }];
    const add = (y, head = false) => out.push({ y: Math.round(y), head });
    document.querySelectorAll('.chead').forEach((h) => add(absTop(h) - navH - 24, true));
    decks.forEach((d) => {
      const top = absTop(d.sc) - navH;
      for (let k = 0; k < d.n; k++) add(top + (k + 0.5) * d.L);
    });
    document.querySelectorAll('.fullagreements, .segindex, .seg, .coresec, .gov, .proplist, .refs, .dlbox')
      .forEach((el) => add(absTop(el) - navH - 16));
    return out.sort((a, b) => a.y - b.y);
  }
  function stepBy(dir) {
    const y = lenis ? lenis.targetScroll : scrollY;
    const all = stops();
    let t = dir > 0 ? all.find((s) => s.y > y + 8) : [...all].reverse().find((s) => s.y < y - 8);
    if (!t) t = { y: dir > 0 ? root.scrollHeight : 0, head: true };
    // Long passages of reading content advance by most of a screen; a jump
    // straight to the next chapter heading may be longer.
    const cap = innerHeight * (t.head ? 1.9 : 0.95);
    scrollToY(Math.abs(t.y - y) > cap ? y + dir * innerHeight * 0.8 : t.y);
  }
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tgt = e.target;
    if (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName)) return;
    let dir = 0;
    if (e.key === 'PageDown' || e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) dir = 1;
    else if (e.key === 'PageUp' || e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) dir = -1;
    if (!dir || (e.key === ' ' && tgt.closest('a, button, summary'))) return;
    e.preventDefault();
    stepBy(dir);
  });

  // ── Reveal on scroll (replays when content re-enters from below) ────
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting || e.boundingClientRect.top < 0) e.target.classList.add('in');
    else e.target.classList.remove('in');
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-u').forEach((el) => io.observe(el));

  // ── Hero: the document re-assembles for different patients ──────────
  const doc = document.querySelector('.herodoc');
  if (doc) {
    const n = doc.querySelectorAll('.cap').length;
    let k = -1;
    let timer = 0;
    let inView = true;
    const next = () => { k = (k + 1) % n; doc.dataset.cfg = k; };
    const start = () => { if (!timer && !reduce && inView && !document.hidden) timer = setInterval(next, 3600); };
    const stop = () => { clearInterval(timer); timer = 0; };
    // Markup ships one configuration for no-JS; start collapsed and assemble.
    if (reduce) { k = 0; next(); } else { doc.dataset.cfg = '-1'; setTimeout(() => { next(); start(); }, 450); }
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) start(); else stop(); }).observe(doc);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  layout();
  update();
  if (document.fonts) document.fonts.ready.then(() => { layout(); update(); });
  addEventListener('load', () => { layout(); update(); });
})();
