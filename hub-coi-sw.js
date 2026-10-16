// Cross-origin isolation of the browser Hub on a static site (GitHub Pages cannot send headers).
// The same idea as web/compiler/coi-sw.js (and coi-serviceworker by Guido Zuidhof, MIT): this one
// file is both the page script and the service worker. The worker adds Cross-Origin-Opener-Policy
// and Cross-Origin-Embedder-Policy to the answers of the Hub, the page becomes crossOriginIsolated,
// and so do the tabs inside it (same-origin frames). Only then the Compiler in a tab of the Hub
// may give a SharedArrayBuffer to the program's worker: the program waits for a line typed in the
// output (input while it runs), as in the Compiler on its own site and in the app.
//
// The Hub is the root site (https://alexalesha.github.io/): the scope of this worker covers the
// other sites of the same address too (/PaintPro/, /Compiler/, ...). Those are left alone: only
// the Hub's own files (the page, web/, app/) get the headers, every other request goes to the
// network untouched.
//
// Nothing happens on a page opened from disk (file://: no service workers) and on a page that is
// isolated already.
/* global clients */
if (typeof window === 'undefined') {
  // ---- the service worker
  const BASE = new URL(self.registration.scope).pathname;          // '/' on the site
  const OWN = (p) => p === BASE || p === BASE + 'index.html' || p.startsWith(BASE + 'web/') || p.startsWith(BASE + 'app/');
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (e) => {
    const r = e.request;
    const u = new URL(r.url);
    if (u.origin !== self.location.origin || !OWN(u.pathname)) return;   // not the Hub: as is
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
    e.respondWith(fetch(r).then((res) => {
      if (res.status === 0) return res;
      const h = new Headers(res.headers);
      h.set('Cross-Origin-Embedder-Policy', 'require-corp');
      h.set('Cross-Origin-Opener-Policy', 'same-origin');
      h.set('Cross-Origin-Resource-Policy', 'same-origin');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }).catch(() => fetch(r)));
  });
} else {
  // ---- the page
  (() => {
    if (!/^https?:$/.test(location.protocol)) return;
    if (window.crossOriginIsolated || !window.isSecureContext || !('serviceWorker' in navigator)) return;
    const KEY = 'hubCoiReloaded';
    let tried = false;
    try { tried = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* storage off: one try */ }
    const script = document.currentScript && document.currentScript.src;
    if (!script) return;
    navigator.serviceWorker.register(script).then((reg) => {
      // the first visit: the page was loaded without the worker - load it once more through it
      if (navigator.serviceWorker.controller || tried) return;
      try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
      const go = () => window.location.reload();
      if (reg.active) go();
      else (reg.installing || reg.waiting).addEventListener('statechange', (ev) => { if (ev.target.state === 'activated') go(); });
    }, () => {});
  })();
}
