(function () {
  var d = document.documentElement;
  var motion = d.classList.contains('motion');
  window.__mpReady = true;
  clearTimeout(window.__mpFail);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* smooth scroll */
  var lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.3 });
    else target.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault();
      closeMenu();
      if (a.dataset.job) { var s = $('#f-job'); if (s) s.value = a.dataset.job; }
      goTo(id === '#top' ? 0 : t);
      if (id === '#quote') setTimeout(function () { var f = $('#f-name'); f && f.focus({ preventScroll: true }); }, 1100);
    });
  });

  /* mobile menu */
  var menuBtn = $('#menuBtn');
  function closeMenu() {
    if (!d.classList.contains('menu-open')) return;
    d.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    lenis && lenis.start();
  }
  menuBtn.addEventListener('click', function () {
    var open = !d.classList.contains('menu-open');
    d.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { lenis && lenis.stop(); var f = $('#mnav a'); f && f.focus(); } else { lenis && lenis.start(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); } });

  /* reveal */
  if (motion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }

  /* videos: load and play only while visible */
  var vids = $$('video[data-src]');
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var v = e.target; if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; pio.unobserve(v); } });
    }, { rootMargin: '600px 0px' });
    vids.forEach(function (v) { if (getComputedStyle(v.parentElement).display !== 'none') pio.observe(v); });
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) { if (!v.poster && v.dataset.poster) v.poster = v.dataset.poster; v.src = v.dataset.src; }
          if (motion) { var p = v.play(); p && p.catch(function () {}); }
        } else if (!v.paused) v.pause();
      });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* lightbox */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  $$('.tile').forEach(function (t) {
    t.addEventListener('click', function () {
      var img = $('img', t);
      lbImg.src = t.dataset.full; lbImg.alt = img.alt; lbCap.textContent = $('figcaption span', t).textContent;
      if (lb.showModal) { lb.showModal(); lenis && lenis.stop(); } else window.open(t.dataset.full, '_blank');
    });
  });
  $('#lbClose').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', function () { lenis && lenis.start(); });

  /* form: validate, then open email with the details */
  var form = $('#form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null;
    $$('[required]', form).forEach(function (f) {
      var wrap = f.closest('.field'), err = $('.err', wrap), msg = '';
      var v = f.value.trim();
      if (!v) msg = f.tagName === 'SELECT' ? 'Pick the type of job so Greg knows what it is.' : 'Please add your ' + wrap.querySelector('label').textContent.toLowerCase().replace('your ', '') + '.';
      else if (f.type === 'tel' && v.replace(/\D/g, '').length < 8) msg = 'That number looks short. Check it so Greg can call you back.';
      wrap.classList.toggle('bad', !!msg); err.textContent = msg; f.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) { ok = false; first = first || f; }
    });
    if (!ok) { first.focus(); return; }
    var g = function (n) { return form.elements[n].value.trim(); };
    var body = 'Hi Greg,\n\nName: ' + g('name') + '\nPhone: ' + g('phone') + '\nSuburb: ' + g('suburb') + '\nJob: ' + g('job') + '\n\n' + (g('message') || '') + '\n\n(Photos attached below)\n';
    var subj = 'Project enquiry: ' + g('job') + ' in ' + g('suburb');
    window.location.href = 'mailto:greg@mapleprojex.com?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
    form.classList.add('sent');
  });

  /* header + mobile bar */
  var hdr = $('#hdr'), mbar = $('#mbar'), lastY = 0;
  var heroEl = $('.hero');
  function onHeader(y) {
    hdr.classList.toggle('is-solid', y > 20);
    var heroEnd = heroEl.offsetTop + heroEl.offsetHeight - innerHeight;
    var hide = y > lastY && y > 400 && !(motion && y < heroEnd) && !d.classList.contains('menu-open');
    hdr.classList.toggle('is-hidden', hide);
    mbar.classList.toggle('on', y > innerHeight * 0.8);
    lastY = y;
  }

  /* ---- motion only below ---- */
  var stage = $('#heroStage'), copy = $('#heroCopy'), media = $('#heroMedia'), over = $('#heroOver'), screw = $('#screw'), threads = $('#threads');
  var cards = $$('.svc'), shades = cards.map(function (c) { return $('.svc-shade', c); });
  var tape = $('#tape'), blade = tape && $('.tape-blade', tape);
  var vh = innerHeight, vw = innerWidth, geo = {};

  function measure() {
    vh = innerHeight; vw = innerWidth;
    if (!motion) return;
    var inset = vw <= 640 ? 8 : 12;
    var H = vh - inset * 2, W = vw - inset * 2;
    var copyBottom = copy.offsetTop + copy.offsetHeight;
    var targetW = Math.min(vw <= 640 ? vw * 0.86 : 640, W);
    var s0 = clamp(targetW / W, 0.3, 0.9);
    var gap = (screw.getBoundingClientRect().height || 110) + (vw <= 640 ? 24 : 34);
    var top0 = copyBottom + gap;
    var ty0 = top0 - (inset + H / 2 - s0 * H / 2);
    geo = { inset: inset, H: H, s0: s0, ty0: ty0, top0: top0, heroTop: heroEl.offsetTop, heroH: heroEl.offsetHeight, screwH: screw.getBoundingClientRect().height || 160 };
  }

  var intro = 0, introStart = performance.now();
  function heroFrame(y) {
    var span = geo.heroH - vh;
    var p = clamp((y - geo.heroTop) / span, 0, 1);
    var drive = easeIO(clamp(p / 0.32, 0, 1));
    var e = easeIO(clamp((p - 0.28) / 0.52, 0, 1));
    var o = easeOut(clamp((p - 0.72) / 0.22, 0, 1));
    var s = lerp(geo.s0, 1, e), ty = lerp(geo.ty0, 0, e);
    media.style.transform = 'translate3d(0,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    var cardTop = geo.inset + geo.H / 2 - s * geo.H / 2 + ty;
    copy.style.transform = 'translate3d(0,' + (-e * 140 - drive * 10).toFixed(1) + 'px,0)';
    copy.style.opacity = (1 - clamp(e * 1.6, 0, 1)).toFixed(3);
    over.style.opacity = o.toFixed(3);
    over.style.transform = 'translate3d(0,' + ((1 - o) * 30).toFixed(1) + 'px,0)';
    // screw: drops in on load, then drives into the card
    var drop = easeOut(intro);
    var L = geo.screwH;
    var screwY = cardTop - L + 4 + drive * L * 0.6 - (1 - drop) * 140;
    screw.style.transform = 'translate3d(0,' + screwY.toFixed(1) + 'px,0) rotate(' + (Math.sin(drive * Math.PI * 6) * 2).toFixed(2) + 'deg)';
    screw.style.opacity = (drop * (1 - clamp(e * 2.2, 0, 1))).toFixed(3);
    threads.setAttribute('transform', 'translate(0,' + (((drive * 90) % 10)).toFixed(2) + ')');
    stage.dataset.p = p.toFixed(2);
  }

  function stackFrame() {
    for (var i = 0; i < cards.length - 1; i++) {
      var next = cards[i + 1].getBoundingClientRect();
      var cur = cards[i].getBoundingClientRect();
      var stick = parseFloat(getComputedStyle(cards[i + 1]).top) || 96;
      var dist = cur.height;
      var cover = clamp(1 - (next.top - stick) / dist, 0, 1);
      cards[i].style.transform = 'scale(' + (1 - cover * 0.05).toFixed(4) + ')';
      shades[i].style.opacity = (cover * 0.35).toFixed(3);
    }
  }

  function tapeFrame() {
    var r = tape.getBoundingClientRect();
    var sec = tape.parentElement.getBoundingClientRect();
    var t = clamp((vh * 0.85 - r.top) / (sec.height * 0.7), 0, 1);
    blade.style.setProperty('--tp', (0.04 + 0.96 * easeOut(t)).toFixed(4));
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    onHeader(y);
    if (!motion) return;
    heroFrame(y);
    if (vw > 0) stackFrame();
    tapeFrame();
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  measure();
  if (motion) {
    // intro drop of the screw
    (function introTick(now) {
      intro = clamp((now - introStart - 450) / 900, 0, 1);
      req();
      if (intro < 1) requestAnimationFrame(introTick);
    })(performance.now());
  }
  if (lenis) lenis.on('scroll', req);
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', function () { measure(); req(); });
  window.addEventListener('load', function () { measure(); req(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); req(); });
  frame();
})();
