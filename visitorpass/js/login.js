/* ============================================================
   login.js — sign-in screen (index.html)
   ============================================================ */
(function (window, document) {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    /* already signed in? go straight to the dashboard */
    if (window.Store.isLoggedIn()) {
      location.replace('dashboard.html');
      return;
    }

    window.UI.showFlash();

    var form = document.getElementById('loginForm');
    var userIn = document.getElementById('loginUser');
    var passIn = document.getElementById('loginPass');

    /* show / hide password */
    document.getElementById('pwToggle').addEventListener('click', function () {
      var shown = passIn.type === 'text';
      passIn.type = shown ? 'password' : 'text';
      this.querySelector('use').setAttribute('href', shown ? '#i-eye' : '#i-eye-off');
      this.setAttribute('aria-label', shown ? 'Show password' : 'Hide password');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var ok = true;
      [userIn, passIn].forEach(function (f) {
        var bad = !f.value.trim();
        f.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });

      if (!ok) {
        window.UI.toast('Enter your username and password to sign in.', 'err');
        return;
      }

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      window.Store.login(userIn.value.trim(), passIn.value).then(function () {
        window.UI.flash('Signed in as ' + window.Store.getUser().name + '.');
        location.href = 'dashboard.html';
      }).catch(function (err) {
        btn.disabled = false;
        passIn.classList.add('invalid');
        window.UI.toast(err.message, 'err');
      });
    });

    document.getElementById('forgotLink').addEventListener('click', function (e) {
      e.preventDefault();
      window.UI.toast('Password reset is not part of this build.', 'err');
    });

  });
})(window, document);
