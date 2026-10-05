/* ============================================================
   store.js — FastAPI-connected data layer for VisitorPass
   ------------------------------------------------------------
   All page scripts call Store.* exactly as before.
   The implementation now uses fetch() against the FastAPI
   backend at http://127.0.0.1:8000/api instead of localStorage.

   Async functions return Promises; page scripts that previously
   used results synchronously now await them.
   ============================================================ */
(function (window) {
  'use strict';

  /* Same-origin when served by FastAPI; fall back to the local backend
     when the pages are opened from file:// or another dev server. */
  var API = (location.port === '8000')
    ? location.origin + '/api'
    : 'http://127.0.0.1:8000/api';

  /* ---------- constants shared across pages ---------- */

  var PURPOSES = [
    'Meeting', 'Interview', 'Delivery', 'Client visit',
    'Maintenance', 'Personal', 'Vendor'
  ];

  var STATUS = {
    inside:  { label: 'Inside',      cls: 'inside'  },
    out:     { label: 'Checked out', cls: 'checked' },
    pending: { label: 'Pending',     cls: 'pending' }
  };

  /* ---------- formatting helpers ---------- */

  function pad(n) { return String(n).padStart(2, '0'); }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function clockNow(date) {
    date = date || new Date();
    var h = date.getHours(), m = date.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    return pad(h % 12 || 12) + ':' + pad(m) + ' ' + ap;
  }

  function timeFrom(hhmm24) {
    if (!hhmm24) return '';
    var parts = hhmm24.split(':');
    var h = Number(parts[0]), m = Number(parts[1]);
    var ap = h >= 12 ? 'PM' : 'AM';
    return pad(h % 12 || 12) + ':' + pad(m) + ' ' + ap;
  }

  function prettyDate(iso) {
    if (!iso) return '';
    var p = iso.split('T')[0].split('-');
    return p[2] + '-' + p[1] + '-' + p[0];
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  /* ---------- API status mapping ----------
     Backend uses: "Checked In" / "Checked Out"
     Frontend uses: "inside" / "out"
  ----------------------------------------- */

  function apiStatusToLocal(v) {
    return {
      id:       v.id,
      name:     v.full_name,
      mobile:   v.phone,
      email:    v.email || '',
      purpose:  v.purpose,
      meet:     v.person_to_visit,
      dept:     v.organization || '',
      date:     v.check_in ? v.check_in.split('T')[0] : todayISO(),
      checkIn:  v.check_in  ? clockNow(new Date(v.check_in))  : '',
      checkOut: v.check_out ? clockNow(new Date(v.check_out)) : '',
      status:   v.status === 'Checked In' ? 'inside' : 'out',
      passNo:   v.visitor_id,
      visitor_id: v.visitor_id,
      photo:    v.photo || '',
      duration: v.duration || ''
    };
  }

  /* ---------- raw fetch helper ---------- */

  function request(path, options) {
    var url = API + path;
    var opts = Object.assign({ headers: { 'Accept': 'application/json' } }, options || {});
    if (opts.body && typeof opts.body === 'object') {
      opts.body = JSON.stringify(opts.body);
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          var msg = (data && data.detail) ? data.detail : ('HTTP ' + res.status);
          if (Array.isArray(msg)) msg = msg.map(function (e) { return e.msg; }).join('; ');
          throw new Error(msg);
        });
      }
      var ct = res.headers.get('content-type') || '';
      return ct.indexOf('application/json') !== -1 ? res.json() : res.text();
    });
  }

  /* ---------- auth stubs (no backend auth) ---------- */

  var SESSION_KEY = 'visitorpass.session';
  function readSession() {
    try { return localStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function writeSession(on) {
    try { if (on) localStorage.setItem(SESSION_KEY, '1'); else localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  var Store = {
    PURPOSES: PURPOSES,
    STATUS: STATUS,
    pad: pad,
    esc: esc,
    todayISO: todayISO,
    timeFrom: timeFrom,
    clockNow: clockNow,
    prettyDate: prettyDate,

    /* --- session (stubbed — no backend auth) --- */

    isLoggedIn: function () { return readSession(); },

    login: function (username, password) {
      return request('/auth/login', { method: 'POST', body: { username: username, password: password } })
        .then(function () { writeSession(true); });
    },

    logout: function () {
      writeSession(false);
    },

    getUser: function () {
      return { name: 'Front Desk', email: 'frontdesk@organisation.com', phone: '' };
    },

    setUser: function (user) { /* no-op: no backend profile endpoint */ },

    /* --- visitors (async, return Promises) --- */

    /* Returns Promise<Array> of localised visitor objects */
    all: function () {
      return request('/visitors').then(function (list) {
        return list.map(apiStatusToLocal);
      });
    },

    /* Find one visitor by numeric id or visitor_id string */
    find: function (id) {
      return request('/visitors/' + encodeURIComponent(id)).then(apiStatusToLocal);
    },

    /* Returns Promise<{total, inside, out, pending}> */
    counts: function () {
      return request('/dashboard/stats').then(function (s) {
        return {
          total:   s.total_visits,
          inside:  s.currently_inside,
          out:     s.visitors_checked_out_today,
          pending: 0
        };
      });
    },

    /* Returns Promise<Array> — filters applied server-side where possible */
    filter: function (opts) {
      opts = opts || {};
      var params = new URLSearchParams();
      if (opts.q)    params.set('search', opts.q);
      if (opts.date) params.set('date',   opts.date);
      if (opts.completedOnly) params.set('status', 'Checked Out');
      return request('/visitors?' + params.toString()).then(function (list) {
        return list.map(apiStatusToLocal);
      });
    },

    /* Add a new visitor. Returns Promise<localVisitor> */
    add: function (visitor) {
      var payload = {
        full_name:      visitor.name,
        phone:          visitor.mobile,
        email:          visitor.email || 'noemail@visitorpass.local',
        organization:   visitor.dept  || 'N/A',
        person_to_visit: visitor.meet,
        purpose:        visitor.purpose,
        id_type:        'Other',
        id_number:      'N/A',
        notes:          visitor.notes || null,
        photo:          visitor.photo || null
      };
      return request('/visitors', { method: 'POST', body: payload }).then(apiStatusToLocal);
    },

    /* Check out a visitor. Returns Promise<localVisitor> */
    checkOut: function (id) {
      // id may be numeric (legacy local id = our api id) or a visitor_id string
      return request('/visitors/' + encodeURIComponent(id) + '/checkout', { method: 'POST' })
        .then(function (res) { return apiStatusToLocal(res.visitor); });
    },

    /* Delete a visitor record. Returns Promise<void> */
    remove: function (id) {
      return request('/visitors/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /* Pass selection (kept in sessionStorage since it is UI-only state) */
    setLastPass: function (passNo) {
      try { sessionStorage.setItem('vp_lastPass', String(passNo)); } catch (e) {}
    },

    lastPass: function () {
      try { return sessionStorage.getItem('vp_lastPass') || null; } catch (e) { return null; }
    },

    reset: function () { /* no-op for API-backed store */ }
  };

  window.Store = Store;
})(window);
