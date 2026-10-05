/* ============================================================
   toast.js — small notification messages
   ------------------------------------------------------------
   Loaded on every page, including the login screen.

     UI.toast('Saved.')            show now
     UI.toast('Failed.', 'err')    show now, error styling
     UI.flash('Signed in.')        show after the next page load
   ============================================================ */
(function (window, document) {
  'use strict';

  var FLASH_KEY = 'visitorpass.flash';

  function box() {
    var el = document.getElementById('toasts');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toasts';
      el.id = 'toasts';
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'err' ? ' err' : '');
    el.innerHTML =
      '<svg class="icon icon-sm"><use href="#' +
      (kind === 'err' ? 'i-alert' : 'i-check') + '"/></svg>' +
      '<span>' + window.Store.esc(msg) + '</span>';
    box().appendChild(el);

    setTimeout(function () {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 260);
    }, 2800);
  }

  /* queue a message to appear after navigating to another page */
  function flash(msg, kind) {
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({ msg: msg, kind: kind }));
    } catch (e) { /* storage unavailable — skip the message */ }
  }

  function showFlash() {
    try {
      var raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      var f = JSON.parse(raw);
      toast(f.msg, f.kind);
    } catch (e) { /* ignore */ }
  }

  window.UI = { toast: toast, flash: flash, showFlash: showFlash };
})(window, document);
