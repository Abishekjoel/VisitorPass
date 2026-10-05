/* ============================================================
   settings.js — settings.html
   ============================================================ */
(function (window, document) {
  'use strict';

  function setErr(el, msg) {
    el.classList.toggle('invalid', !!msg);
    var s = document.querySelector('.err[data-for="' + el.id + '"]');
    if (s) s.textContent = msg || '';
  }

  window.initPage = function () {
    var S = window.Store;
    var user = S.getUser();

    /* fill the form and the header from the stored profile */
    document.getElementById('p-name').value = user.name;
    document.getElementById('p-email').value = user.email;
    document.getElementById('p-phone').value = user.phone;
    document.getElementById('profName').textContent = user.name;
    document.getElementById('profEmail').textContent = user.email;

    document.getElementById('photoBtn').addEventListener('click', function () {
      window.UI.toast('Photo upload needs the backend.', 'err');
    });

    document.getElementById('p-phone').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });

    document.getElementById('profForm').addEventListener('submit', function (e) {
      e.preventDefault();

      var name  = document.getElementById('p-name');
      var email = document.getElementById('p-email');
      var phone = document.getElementById('p-phone');
      var cur   = document.getElementById('p-cur');
      var npw   = document.getElementById('p-new');
      var conf  = document.getElementById('p-conf');

      var ok = true;

      if (name.value.trim().length < 2) { setErr(name, 'Enter your name.'); ok = false; }
      else setErr(name, '');

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.value.trim())) {
        setErr(email, 'Enter a valid email address.'); ok = false;
      } else setErr(email, '');

      if (!/^[0-9]{10}$/.test(phone.value.trim())) {
        setErr(phone, 'Enter a 10-digit phone number.'); ok = false;
      } else setErr(phone, '');

      if (npw.value && npw.value !== conf.value) {
        setErr(conf, 'Passwords do not match.'); ok = false;
      } else setErr(conf, '');

      if (!ok) {
        window.UI.toast('Check the highlighted fields.', 'err');
        return;
      }

      S.setUser({
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim()
      });

      cur.value = npw.value = conf.value = '';
      document.getElementById('profName').textContent = name.value.trim();
      document.getElementById('profEmail').textContent = email.value.trim();
      document.getElementById('chipName').textContent = name.value.trim();

      window.UI.toast('Profile updated.');
    });
  };
})(window, document);
