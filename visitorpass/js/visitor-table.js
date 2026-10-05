/* ============================================================
   visitor-table.js — visitor-list.html and pass-history.html
   (API-connected version)
   ============================================================ */
(function (window, document) {
  'use strict';

  var PER_PAGE = 8;
  var view = { q: '', date: '', page: 1, openMenu: null };
  var _cachedRows = [];

  function fetchAndRender() {
    return window.Store.filter({
      q:             view.q,
      date:          view.date,
      completedOnly: window.TABLE_MODE === 'completed'
    }).then(function (data) {
      _cachedRows = data;
      render(data);
    }).catch(function (err) {
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="8" class="empty"><strong>Connection error</strong>' + err.message + '</td></tr>';
    });
  }

  function pagerHtml(pages) {
    var out = '<button data-page="prev"' + (view.page === 1 ? ' disabled' : '') +
              ' aria-label="Previous page"><svg class="icon icon-sm">' +
              '<use href="#i-chev-l"/></svg></button>';
    for (var p = 1; p <= pages; p++) {
      out += '<button data-page="' + p + '"' +
             (p === view.page ? ' class="on"' : '') + '>' + p + '</button>';
    }
    out += '<button data-page="next"' + (view.page === pages ? ' disabled' : '') +
           ' aria-label="Next page"><svg class="icon icon-sm">' +
           '<use href="#i-chev-r"/></svg></button>';
    return out;
  }

  function rowHtml(v, index) {
    var S = window.Store;
    var rowId = v.visitor_id || v.id;
    var menu = view.openMenu === rowId
      ? '<div class="menu">' +
          '<button data-act="view" data-id="' + rowId + '">' +
            '<svg class="icon icon-sm"><use href="#i-badge"/></svg> View pass</button>' +
          '<button data-act="checkout" data-id="' + rowId + '"' +
            (v.status === 'out' ? ' disabled' : '') + '>' +
            '<svg class="icon icon-sm"><use href="#i-out"/></svg> Check out</button>' +
          '<button class="danger" data-act="delete" data-id="' + rowId + '">' +
            '<svg class="icon icon-sm"><use href="#i-trash"/></svg> Delete record</button>' +
        '</div>'
      : '';

    return '<tr>' +
      '<td class="muted">' + index + '</td>' +
      '<td class="name">' + S.esc(v.name) + '</td>' +
      '<td class="muted">' + S.esc(v.mobile) + '</td>' +
      '<td class="muted">' + S.esc(v.purpose) + '</td>' +
      '<td class="muted">' + S.esc(v.checkIn) + '</td>' +
      '<td class="muted">' + S.esc(v.checkOut || '—') + '</td>' +
      '<td><span class="pill ' + S.STATUS[v.status].cls + '">' +
        S.STATUS[v.status].label + '</span></td>' +
      '<td><span class="menu-wrap">' +
        '<button class="kebab" data-menu="' + rowId + '" aria-label="Actions for ' +
          S.esc(v.name) + '"><svg class="icon icon-sm"><use href="#i-dots"/></svg></button>' +
        menu +
      '</span></td>' +
    '</tr>';
  }

  function render(all) {
    var pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    if (view.page > pages) view.page = pages;

    var start = (view.page - 1) * PER_PAGE;
    var slice = all.slice(start, start + PER_PAGE);

    document.getElementById('tableBody').innerHTML = slice.length
      ? slice.map(function (v, i) { return rowHtml(v, start + i + 1); }).join('')
      : '<tr><td colspan="8" class="empty"><strong>No records match</strong>' +
        'Try a different name, number or date.</td></tr>';

    document.getElementById('rowCount').textContent = all.length
      ? 'Showing ' + (start + 1) + '–' + Math.min(start + PER_PAGE, all.length) +
        ' of ' + all.length
      : 'No records';

    document.getElementById('pager').innerHTML = pagerHtml(pages);

    var clear = document.getElementById('clearBtn');
    clear.hidden = !(view.q || view.date);

    bindRows(pages, all);
  }

  function bindRows(pages, all) {
    var S = window.Store;

    document.querySelectorAll('#pager button').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.page;
        if (p === 'prev') view.page = Math.max(1, view.page - 1);
        else if (p === 'next') view.page = Math.min(pages, view.page + 1);
        else view.page = Number(p);
        render(all);
      });
    });

    document.querySelectorAll('[data-menu]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.menu;
        view.openMenu = view.openMenu === id ? null : id;
        render(all);
      });
    });

    document.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.id;
        var v = all.filter(function (x) { return String(x.visitor_id || x.id) === String(id); })[0];
        view.openMenu = null;
        if (!v) { fetchAndRender(); return; }

        if (b.dataset.act === 'view') {
          S.setLastPass(v.passNo || v.visitor_id);
          location.href = 'visitor-pass.html?id=' + encodeURIComponent(v.visitor_id || v.id);
          return;
        }
        if (b.dataset.act === 'checkout') {
          b.disabled = true;
          S.checkOut(v.visitor_id || v.id).then(function (updated) {
            window.UI.toast(updated.name + ' checked out at ' + updated.checkOut + '.');
            fetchAndRender();
          }).catch(function (err) {
            window.UI.toast('Check-out failed: ' + err.message, 'err');
            b.disabled = false;
          });
          return;
        }
        if (b.dataset.act === 'delete') {
          if (!confirm('Delete record for ' + v.name + '?')) return;
          S.remove(v.visitor_id || v.id).then(function () {
            window.UI.toast('Record for ' + v.name + ' deleted.');
            fetchAndRender();
          }).catch(function (err) {
            window.UI.toast('Delete failed: ' + err.message, 'err');
          });
        }
      });
    });
  }

  window.initPage = function () {
    var search  = document.getElementById('searchBox');
    var dateBox = document.getElementById('dateBox');

    // Initial load
    document.getElementById('tableBody').innerHTML =
      '<tr><td colspan="8" class="empty">Loading…</td></tr>';
    fetchAndRender();

    search.addEventListener('input', function () {
      view.q = this.value;
      view.page = 1;
      fetchAndRender();
    });

    dateBox.addEventListener('change', function () {
      view.date = this.value;
      view.page = 1;
      fetchAndRender();
    });

    document.getElementById('clearBtn').addEventListener('click', function () {
      view.q = ''; view.date = ''; view.page = 1;
      search.value = ''; dateBox.value = '';
      fetchAndRender();
    });

    document.addEventListener('click', function (e) {
      if (view.openMenu !== null && !e.target.closest('.menu-wrap')) {
        view.openMenu = null;
        render(_cachedRows);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && view.openMenu !== null) {
        view.openMenu = null;
        render(_cachedRows);
      }
    });
  };
})(window, document);
