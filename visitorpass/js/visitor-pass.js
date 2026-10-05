/* ============================================================
   visitor-pass.js — visitor-pass.html  (API-connected)
   ============================================================ */
(function (window, document) {
  'use strict';

  function qrSvg(seedText) {
    var N = 25, cell = 4;
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i++) {
      h ^= seedText.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    function rnd() {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    }
    function isFinder(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
    }
    var cells = '';
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (isFinder(r, c)) continue;
        if (rnd() > 0.52) {
          cells += '<rect x="' + (c * cell) + '" y="' + (r * cell) +
                   '" width="' + cell + '" height="' + cell + '"/>';
        }
      }
    }
    function eye(x, y) {
      return '<rect x="' + x + '" y="' + y + '" width="28" height="28"/>' +
             '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="20" height="20" fill="#fff"/>' +
             '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="12" height="12"/>';
    }
    return '<svg class="qr" viewBox="0 0 100 100" role="img" aria-label="Pass code for ' +
             window.Store.esc(seedText) + '">' +
             '<rect width="100" height="100" fill="#fff"/>' +
             '<g fill="#0f1b2d">' + cells + eye(0, 0) + eye(72, 0) + eye(0, 72) + '</g>' +
           '</svg>';
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function renderPass(v) {
    var S = window.Store;
    var host = document.getElementById('passHost');

    function row(key, value) {
      return '<dt>' + key + '</dt><span class="colon">:</span>' +
             '<dd>' + S.esc(value || '—') + '</dd>';
    }

    host.innerHTML =
      '<div class="pass-stage"><article class="pass">' +
        '<div class="pass-top">' +
          '<svg class="icon"><use href="#i-building"/></svg>' +
          '<h2>Visitor Pass</h2>' +
          '<p>Welcome to our premises</p>' +
        '</div>' +
        '<div class="pass-body">' +
          '<div class="photo">' + (v.photo
            ? '<img alt="Photo of ' + S.esc(v.name) + '" src="' + S.esc(v.photo) + '">'
            : '<svg viewBox="0 0 100 116"><use href="#face"/></svg>') + '</div>' +
          '<dl class="pass-rows">' +
            row('Name',           v.name) +
            row('Mobile',         v.mobile) +
            row('Purpose',        v.purpose) +
            row('Person to meet', v.meet) +
            row('Date',           v.date ? S.prettyDate(v.date) : '—') +
            row('Time',           v.checkIn) +
          '</dl>' +
          '<div class="qr-col">' +
            qrSvg(v.passNo) +
            '<div class="lbl">Pass no.</div>' +
            '<div class="no">' + S.esc(v.passNo) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pass-foot">Carry this pass and show it at the security desk.</div>' +
      '</article></div>';

    document.getElementById('printBtn').onclick = function () { window.print(); };
    document.getElementById('pdfBtn').onclick = function () { downloadPdf(v); };
  }

  function downloadPdf(v) {
    var btn = document.getElementById('pdfBtn');
    var el = document.querySelector('.pass');
    if (!window.html2canvas || !window.jspdf) {
      window.UI.toast('PDF libraries failed to load. Check your internet connection.', 'err');
      return;
    }
    btn.disabled = true;
    window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff' }).then(function (canvas) {
      var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      var w = 130, h = w * canvas.height / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (210 - w) / 2, 20, w, h);
      pdf.save('visitor-pass-' + v.passNo + '.pdf');
    }).catch(function (e) {
      window.UI.toast('Could not create PDF: ' + e.message, 'err');
    }).then(function () { btn.disabled = false; });
  }

  window.initPage = function () {
    var S = window.Store;
    var host = document.getElementById('passHost');

    host.innerHTML = '<div class="empty">Loading pass…</div>';

    var idParam = param('id');
    var lastPassId = S.lastPass();
    var lookupId = idParam || lastPassId;

    if (!lookupId) {
      host.innerHTML =
        '<section class="card"><div class="empty">' +
          '<strong>No pass to show</strong>' +
          'Register a visitor to generate a pass.' +
        '</div></section>';
      var bar = document.getElementById('passBar');
      if (bar) bar.style.display = 'none';
      return;
    }

    S.find(lookupId).then(function (v) {
      renderPass(v);
    }).catch(function () {
      host.innerHTML =
        '<section class="card"><div class="empty">' +
          '<strong>Pass not found</strong>' +
          'The visitor record may have been deleted.' +
        '</div></section>';
    });
  };
})(window, document);
