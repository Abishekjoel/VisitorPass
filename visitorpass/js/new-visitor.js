/* ============================================================
   new-visitor.js — new-visitor.html  (API-connected)
   ============================================================ */
(function (window, document) {
  'use strict';

  var RULES = [
    ['f-name',    function (v) { return v.trim().length >= 2; },
                  'Enter the visitor\'s full name.'],
    ['f-mobile',  function (v) { return /^[0-9]{7,15}$/.test(v.trim().replace(/[\s\-+]/g, '')); },
                  'Enter a valid mobile number.'],
    ['f-email',   function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
                  'Enter a valid email address.'],
    ['f-purpose', function (v) { return !!v; },
                  'Select the purpose of the visit.'],
    ['f-meet',    function (v) { return v.trim().length >= 2; },
                  'Enter who the visitor is meeting.'],
    ['f-date',    function (v) { return !!v; },
                  'Choose the date of visit.'],
    ['f-time',    function (v) { return !!v; },
                  'Choose the time of visit.']
  ];

  function validate() {
    var ok = true, first = null;
    RULES.forEach(function (rule) {
      var el = document.getElementById(rule[0]);
      var msg = document.querySelector('.err[data-for="' + rule[0] + '"]');
      var bad = !rule[1](el.value);
      el.classList.toggle('invalid', bad);
      if (msg) msg.textContent = bad ? rule[2] : '';
      if (bad && !first) first = el;
      if (bad) ok = false;
    });
    if (first) first.focus();
    return ok;
  }

  function nowHHMM() {
    var S = window.Store, n = new Date();
    return S.pad(n.getHours()) + ':' + S.pad(n.getMinutes());
  }

  /* Resize to max 360px and re-encode as JPEG so the stored photo stays small. */
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 360, r = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }

  window.initPage = function () {
    var photoData = '';
    var photoIn = document.getElementById('f-photo');
    var preview = document.getElementById('photoPreview');
    var removeBtn = document.getElementById('photoRemove');
    var photoErr = document.querySelector('.err[data-for="f-photo"]');
    var emptyPreview = preview.innerHTML;

    function clearPhoto() {
      photoData = ''; photoIn.value = '';
      preview.innerHTML = emptyPreview; removeBtn.hidden = true;
    }
    photoIn.addEventListener('change', function () {
      var f = photoIn.files[0];
      photoErr.textContent = '';
      if (!f) { clearPhoto(); return; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        photoErr.textContent = 'Choose a JPEG, PNG or WebP image.'; clearPhoto(); return;
      }
      if (f.size > 8 * 1024 * 1024) {
        photoErr.textContent = 'Image must be under 8 MB.'; clearPhoto(); return;
      }
      resizeImage(f).then(function (data) {
        photoData = data;
        preview.innerHTML = '<img alt="Visitor photo preview" src="' + data + '">';
        removeBtn.hidden = false;
      }).catch(function (e) { photoErr.textContent = e.message; clearPhoto(); });
    });
    removeBtn.addEventListener('click', clearPhoto);

    var S = window.Store;
    var form = document.getElementById('regForm');
    var submitBtn = form.querySelector('[type="submit"]');

    /* fill the purpose dropdown */
    document.getElementById('f-purpose').innerHTML =
      '<option value="">Select purpose</option>' +
      S.PURPOSES.map(function (p) { return '<option>' + p + '</option>'; }).join('');

    /* default to right now */
    document.getElementById('f-date').value = S.todayISO();
    document.getElementById('f-time').value = nowHHMM();

    /* digits only in mobile field */
    document.getElementById('f-mobile').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 15);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      form.reset();
      clearPhoto();
      document.getElementById('f-date').value = S.todayISO();
      document.getElementById('f-time').value = nowHHMM();
      form.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      form.querySelectorAll('.err').forEach(function (el) { el.textContent = ''; });
      window.UI.toast('Form cleared.');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        window.UI.toast('Check the highlighted fields.', 'err');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering…';

      var visitorData = {
        name:    document.getElementById('f-name').value.trim(),
        mobile:  document.getElementById('f-mobile').value.trim(),
        email:   document.getElementById('f-email').value.trim(),
        purpose: document.getElementById('f-purpose').value,
        meet:    document.getElementById('f-meet').value.trim(),
        dept:    document.getElementById('f-dept').value.trim(),
        photo:   photoData,
        date:    document.getElementById('f-date').value,
        checkIn: S.timeFrom(document.getElementById('f-time').value)
      };

      S.add(visitorData).then(function (visitor) {
        S.setLastPass(visitor.passNo);
        window.UI.flash('Pass ' + visitor.passNo + ' generated for ' + visitor.name + '.');
        location.href = 'visitor-pass.html';
      }).catch(function (err) {
        window.UI.toast('Registration failed: ' + err.message, 'err');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate pass';
      });
    });
  };
})(window, document);
