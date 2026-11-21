/*
 * Mago Labs site guard (readable source; the build obfuscates it into main.js).
 * 1. Domain lock: runs only on the allowed hosts, anywhere else it sends the visitor to magolabs.in.
 * 2. Copy protection: blocks right-click, text selection, dragging, copy and the usual
 *    view-source / save / DevTools shortcuts. Form fields still work normally.
 * 3. Demo banner guard: the banner lives in a closed shadow root on a randomly named element
 *    and is rebuilt if anyone deletes, hides, edits or moves it.
 * Sets window-scoped __mpOK; main.js only runs when it is true.
 */
var __mpOK = (function () {
  var HOSTS = ['mapleprojex.vercel.app', 'localhost', '127.0.0.1'];
  var HOME = 'https://magolabs.in/';
  var host = location.hostname;
  if (HOSTS.indexOf(host) === -1) {
    try { document.documentElement.style.display = 'none'; } catch (e) {}
    location.replace(HOME);
    return false;
  }

  /* ---------- copy protection ---------- */
  var editable = function (t) {
    return t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]');
  };
  ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!editable(e.target)) e.preventDefault(); }, true);
  });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    var block =
      k === 'f12' ||
      (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) || // DevTools (Win/Linux)
      (mod && e.altKey && (k === 'i' || k === 'j' || k === 'c' || k === 'u')) ||   // DevTools / source (Mac)
      (mod && (k === 'u' || k === 's' || k === 'p')) ||                             // view source, save, print
      (mod && (k === 'a' || k === 'c' || k === 'x') && !editable(e.target));        // select all / copy outside fields
    if (block) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  var lockImgs = function () {
    Array.prototype.forEach.call(document.images, function (i) { i.setAttribute('draggable', 'false'); });
  };

  /* ---------- demo banner ---------- */
  var MSG = 'Concept website prepared for <strong>Maple Projex</strong> by ' +
    '<a href="https://magolabs.in" target="_blank" rel="noopener">Mago Labs</a>. Not the live site.';
  var KEY = 'Concept website prepared for Maple Projex by Mago Labs. Not the live site.';
  var HOST_CSS =
    'all:initial!important;display:block!important;position:relative!important;z-index:2147483000!important;' +
    'visibility:visible!important;opacity:1!important;transform:none!important;filter:none!important;' +
    'clip-path:none!important;mask:none!important;width:auto!important;height:auto!important;' +
    'min-height:20px!important;max-height:none!important;overflow:visible!important;margin:0!important;' +
    'pointer-events:auto!important;font-family:inherit!important';
  var FIXED_CSS = HOST_CSS.replace('position:relative', 'position:fixed') +
    ';left:0!important;right:0!important;bottom:0!important;top:auto!important';
  var SHADOW_CSS =
    ':host{all:initial}div{display:block;background:var(--ink,#171310);color:#e9e3da;font:400 13px/1.4 ' +
    'Archivo,system-ui,sans-serif;text-align:center;padding:9px var(--gut,20px)}strong{color:#fff;font-weight:650}' +
    'a{color:inherit;text-decoration:underline;text-underline-offset:2px}';

  var el = null, root = null, rebuilds = 0, fixedMode = false;
  var rnd = function () { return 'x-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36); };

  function build() {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = document.createElement(rnd());
    el.setAttribute('style', fixedMode ? FIXED_CSS : HOST_CSS);
    el.setAttribute('role', 'note');
    root = el.attachShadow({ mode: 'closed' });
    root.innerHTML = '<style>' + SHADOW_CSS + '</style><div>' + MSG + '</div>';
    place();
  }
  function place() {
    if (fixedMode) { document.documentElement.appendChild(el); return; }
    var b = document.body, skip = b.querySelector('.skip');
    if (skip && skip.parentNode === b) b.insertBefore(el, skip.nextSibling);
    else b.insertBefore(el, b.firstChild);
  }
  function healthy() {
    if (!el || !el.isConnected) return false;
    if (!fixedMode && el.parentNode !== document.body) return false;
    if (el.getAttribute('style') !== (fixedMode ? FIXED_CSS : HOST_CSS)) return false;
    var div = root.querySelector('div'), st = root.querySelector('style');
    if (!div || !st || st.textContent !== SHADOW_CSS) return false;
    if (div.textContent.replace(/\s+/g, ' ').trim() !== KEY) return false;
    var cs = getComputedStyle(el), dcs = getComputedStyle(div);
    if (cs.display === 'none' || cs.visibility !== 'visible' || +cs.opacity < 0.95) return false;
    if (dcs.display === 'none' || dcs.visibility !== 'visible' || +dcs.opacity < 0.95) return false;
    if (el.offsetHeight < 20 || el.offsetWidth < 200) return false;
    // something on top of it?
    var r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      var hit = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), r.top + Math.min(r.height / 2, 10));
      if (hit && hit !== el && !el.contains(hit) && !(hit.closest && hit.closest('.hdr, header, nav, dialog, .mnav, .mbar'))) return false;
    }
    return true;
  }
  function check() {
    if (healthy()) return;
    rebuilds++;
    if (rebuilds > 3 && !fixedMode) fixedMode = true; // someone keeps hiding the in-page one: pin it to the screen
    build();
  }

  function start() {
    var ns = document.querySelector('noscript.demo-ns');
    if (ns && ns.parentNode) ns.parentNode.removeChild(ns);
    lockImgs();
    build();
    new MutationObserver(function () { check(); }).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden']
    });
    setInterval(check, 1200);
    setInterval(lockImgs, 4000);
    try {
      console.log('%cDesigned and built by Mago Labs (magolabs.in). This code is protected and not licensed for reuse.',
        'font:600 13px system-ui;color:#c4622d');
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  return true;
})();
