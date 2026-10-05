/* ============================================================
   dashboard.js — dashboard.html  (API-connected)
   ============================================================ */
(function (window, document) {
  'use strict';

  /* Visitors per weekday — fetched from the stats endpoint */
  var WEEK = [
    ['Mon', 0], ['Tue', 0], ['Wed', 0], ['Thu', 0],
    ['Fri', 0], ['Sat', 0], ['Sun', 0]
  ];

  function barChart(data) {
    var W = 320, H = 170, padL = 26, padB = 22, padT = 10;
    var max = 40;
    var plotH = H - padB - padT;
    var plotW = W - padL - 6;
    var step = plotW / data.length;
    var bw = Math.min(20, step * 0.46);
    var g = '';

    for (var v = 0; v <= max; v += 10) {
      var y = padT + plotH - (v / max) * plotH;
      g += '<line class="grid-line" x1="' + padL + '" y1="' + y +
           '" x2="' + (W - 6) + '" y2="' + y + '"/>';
      g += '<text class="axis-txt" x="' + (padL - 7) + '" y="' + (y + 3.5) +
           '" text-anchor="end">' + v + '</text>';
    }

    data.forEach(function (row, i) {
      var label = row[0], value = row[1];
      var h = (value / max) * plotH;
      var x = padL + i * step + (step - bw) / 2;
      var y = padT + plotH - h;
      g += '<g class="bar-wrap"><title>' + label + ': ' + value + ' visitors</title>' +
           '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
           '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, 2).toFixed(1) +
           '" rx="3"/>' +
           '<text class="axis-txt" x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 6) +
           '" text-anchor="middle">' + label + '</text></g>';
    });

    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H +
           '" role="img" aria-label="Visitors per day this week">' + g + '</svg></div>';
  }

  function statCard(cls, icon, label, num, note) {
    return '<div class="stat ' + cls + '">' +
      '<div class="tile"><svg class="icon"><use href="#' + icon + '"/></svg></div>' +
      '<div class="lbl">' + label + '</div>' +
      '<div class="num">' + num + '</div>' +
      '<div class="note">' + note + '</div>' +
    '</div>';
  }

  window.initPage = function () {
    var S = window.Store;

    // Counts from /api/dashboard/stats
    S.counts().then(function (c) {
      document.getElementById('stats').innerHTML =
        statCard('total',   'i-users',     'Total visitors',    c.total,   'Today') +
        statCard('active',  'i-in',        'Currently inside',  c.inside,  'On the premises now') +
        statCard('out',     'i-out',       'Checked out',       c.out,     'Today') +
        statCard('pending', 'i-hourglass', 'All time',          c.total,   'Visits ever logged');
    }).catch(function (err) {
      document.getElementById('stats').innerHTML =
        '<p style="color:#c00;padding:12px;">Unable to load stats — is the server running?<br>' + err.message + '</p>';
    });

    // Recent visitors from /api/visitors
    S.all().then(function (visitors) {
      var recent = visitors.slice(0, 5);
      document.getElementById('recentBody').innerHTML = recent.length
        ? recent.map(function (v) {
            return '<tr>' +
              '<td class="name">' + S.esc(v.name) + '</td>' +
              '<td class="muted">' + S.esc(v.purpose) + '</td>' +
              '<td class="muted">' + S.esc(v.checkIn) + '</td>' +
              '<td><span class="pill ' + S.STATUS[v.status].cls + '">' +
                S.STATUS[v.status].label + '</span></td>' +
            '</tr>';
          }).join('')
        : '<tr><td colspan="4" class="empty"><strong>No visitors yet</strong>' +
          'Register a visitor to see them here.</td></tr>';

      // Build week chart from real data (count per weekday)
      var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var counts = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0, Sat:0, Sun:0 };
      visitors.forEach(function (v) {
        if (v.date) {
          var d = new Date(v.date);
          var label = days[d.getDay()];
          if (counts[label] !== undefined) counts[label]++;
        }
      });
      var weekData = [['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (d) {
        return [d, counts[d]];
      })][0];
      document.getElementById('chartBox').innerHTML = barChart(weekData);
    }).catch(function (err) {
      var rb = document.getElementById('recentBody');
      if (rb) rb.innerHTML =
        '<tr><td colspan="4" class="empty"><strong>Connection error</strong>' + err.message + '</td></tr>';
    });
  };
})(window, document);
