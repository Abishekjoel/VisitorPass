/* ============================================================
   ui.js — shared chrome for every signed-in page
   ------------------------------------------------------------
   Builds the sidebar and top bar and guards pages behind the
   login. Include on every signed-in page, after store.js and
   toast.js. Each page exposes its own initPage() function,
   which this file calls once the shell is in place.
   ============================================================ */
(function (window, document) {
  'use strict';

  var NAV = [
    { href: 'dashboard.html',    icon: 'i-home',     label: 'Dashboard' },
    { href: 'new-visitor.html',  icon: 'i-userplus', label: 'New visitor' },
    { href: 'visitor-list.html', icon: 'i-list',     label: 'Visitor list' },
    { href: 'pass-history.html', icon: 'i-clock',    label: 'Pass history' },
    { href: 'settings.html',     icon: 'i-gear',     label: 'Settings' }
  ];

  /* Pages that highlight a nav item other than their own filename. */
  var NAV_ALIAS = { 'visitor-pass.html': 'visitor-list.html' };

  /* ---------- shell ---------- */

  function currentPage() {
    var file = location.pathname.split('/').pop();
    return file || 'dashboard.html';
  }

  function buildShell() {
    var page = currentPage();
    var active = NAV_ALIAS[page] || page;
    var user = window.Store.getUser();

    var links = NAV.map(function (n) {
      return '<a href="' + n.href + '"' +
             (n.href === active ? ' class="active"' : '') + '>' +
             '<svg class="icon icon-sm"><use href="#' + n.icon + '"/></svg> ' +
             n.label + '</a>';
    }).join('');

    var shell = document.createElement('div');
    shell.innerHTML =
      '<div class="scrim" id="scrim"></div>' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="side-brand">' +
          '<svg class="icon"><use href="#i-badge"/></svg> Visitor Pass' +
        '</div>' +
        '<nav class="nav">' + links + '</nav>' +
        '<div class="side-foot">Front desk &middot; Main gate</div>' +
      '</aside>';

    /* The page's own <main class="page"> is moved inside the shell. */
    var main = document.createElement('div');
    main.className = 'main';
    main.innerHTML =
      '<header class="topbar">' +
        '<button class="burger" id="burger" aria-label="Open menu">' +
          '<svg class="icon"><use href="#i-burger"/></svg></button>' +
        '<button class="bell" aria-label="Notifications">' +
          '<svg class="icon"><use href="#i-bell"/></svg><span class="dot"></span></button>' +
        '<a class="user-chip" href="settings.html">' +
          '<span class="avatar"><svg viewBox="0 0 100 116"><use href="#face"/></svg></span>' +
          '<span id="chipName">' + window.Store.esc(user.name) + '</span>' +
          '<svg class="icon icon-sm"><use href="#i-chev-d"/></svg>' +
        '</a>' +
        '<button class="bell" id="logoutBtn" aria-label="Sign out" title="Sign out">' +
          '<svg class="icon"><use href="#i-out"/></svg></button>' +
      '</header>';

    var pageEl = document.querySelector('main.page');
    document.body.insertBefore(shell.firstChild, document.body.firstChild); // scrim
    document.body.insertBefore(shell.firstChild, document.body.firstChild); // sidebar
    main.appendChild(pageEl);
    pageEl.removeAttribute('hidden');
    document.body.appendChild(main);

    document.body.classList.add('app-ready');

    /* mobile drawer */
    var sidebar = document.getElementById('sidebar');
    var scrim = document.getElementById('scrim');
    function close() { sidebar.classList.remove('open'); scrim.classList.remove('on'); }
    document.getElementById('burger').addEventListener('click', function () {
      sidebar.classList.add('open');
      scrim.classList.add('on');
    });
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
      window.Store.logout();
      window.UI.flash('Signed out.');
      location.href = 'index.html';
    });
  }

  /* ---------- boot ---------- */

  function init() {
    // Backend has no auth; sign-in is a client-side session flag.
    if (!window.Store.isLoggedIn()) {
      location.replace('index.html');
      return;
    }
    buildShell();
    window.UI.showFlash();
    if (typeof window.initPage === 'function') window.initPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
